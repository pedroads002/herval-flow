import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { friendlyError } from "@/lib/api";
import type { DemandPriority, DemandStatus } from "@/lib/demands";
import { sendDemandWhatsAppNotification } from "@/lib/evolution.functions";

export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type Demand = Database["public"]["Tables"]["demands"]["Row"];
export type DemandComment = Database["public"]["Tables"]["demand_comments"]["Row"];
export type DemandEvent = Database["public"]["Tables"]["demand_events"]["Row"];

export type DemandWithRelations = Demand & {
  clinic: { id: string; name: string } | null;
  demand_tags: { tag: Tag | null }[];
};

function assertOk<T>(result: { data: T; error: unknown }) {
  if (result.error) throw result.error;
  return result.data;
}

/* ---------------------------------- TAGS --------------------------------- */

export function useTags(options?: { onlyActive?: boolean }) {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () =>
      assertOk(await supabase.from("tags").select("*").order("name", { ascending: true })) as Tag[],
    select: (data) => (options?.onlyActive ? data.filter((t) => t.is_active) : data),
  });
}

export function useSaveTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; is_active?: boolean }) => {
      const payload = { name: input.name.trim(), is_active: input.is_active ?? true };
      if (input.id) {
        return assertOk(
          await supabase.from("tags").update(payload).eq("id", input.id).select().single(),
        );
      }
      const { data: userData } = await supabase.auth.getUser();
      return assertOk(
        await supabase
          .from("tags")
          .insert({ ...payload, created_by: userData.user?.id ?? null })
          .select()
          .single(),
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["demands"] });
      toast.success(vars.id ? "Etiqueta atualizada." : "Etiqueta criada.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível salvar a etiqueta.")),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Etiqueta removida.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível remover a etiqueta.")),
  });
}

/* -------------------------------- DEMANDAS -------------------------------- */

export function useDemands(options: { includeArchived?: boolean } = {}) {
  return useQuery({
    queryKey: ["demands", options.includeArchived ?? false],
    queryFn: async () => {
      let query = supabase
        .from("demands")
        .select("*, clinic:clinics(id, name), demand_tags(tag:tags(*))")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!options.includeArchived) query = query.is("archived_at", null);
      return assertOk(await query) as DemandWithRelations[];
    },
  });
}

export function useDemandComments(demandId: string) {
  return useQuery({
    queryKey: ["demand-comments", demandId],
    queryFn: async () =>
      assertOk(
        await supabase
          .from("demand_comments")
          .select("*")
          .eq("demand_id", demandId)
          .order("created_at", { ascending: true }),
      ) as DemandComment[],
    enabled: Boolean(demandId),
  });
}

export function useDemandEvents(demandId: string) {
  return useQuery({
    queryKey: ["demand-events", demandId],
    queryFn: async () =>
      assertOk(
        await supabase
          .from("demand_events")
          .select("*")
          .eq("demand_id", demandId)
          .order("created_at", { ascending: false }),
      ) as DemandEvent[],
    enabled: Boolean(demandId),
  });
}

export type DemandInput = {
  id?: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  clinic_id?: string | null;
  priority: DemandPriority;
  status: DemandStatus;
  start_date?: string | null;
  due_at?: string | null;
  tagIds: string[];
};

async function syncTags(demandId: string, tagIds: string[]) {
  const current = assertOk(
    await supabase.from("demand_tags").select("tag_id").eq("demand_id", demandId),
  ) as { tag_id: string }[];
  const currentIds = current.map((row) => row.tag_id);
  const toAdd = tagIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !tagIds.includes(id));
  if (toRemove.length) {
    const { error } = await supabase
      .from("demand_tags")
      .delete()
      .eq("demand_id", demandId)
      .in("tag_id", toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await supabase
      .from("demand_tags")
      .insert(toAdd.map((tag_id) => ({ demand_id: demandId, tag_id })));
    if (error) throw error;
  }
}

export function useSaveDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DemandInput) => {
      const payload = {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        assigned_to: input.assigned_to || null,
        clinic_id: input.clinic_id || null,
        priority: input.priority,
        status: input.status,
        start_date: input.start_date || null,
        due_at: input.due_at || null,
      };
      let demand: Demand;
      if (input.id) {
        demand = assertOk(
          await supabase.from("demands").update(payload).eq("id", input.id).select().single(),
        ) as Demand;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        demand = assertOk(
          await supabase
            .from("demands")
            .insert({ ...payload, created_by: userData.user?.id ?? null })
            .select()
            .single(),
        ) as Demand;
      }
      await syncTags(demand.id, input.tagIds);

      // WhatsApp: somente novas demandas com responsável definido.
      // Falha no WhatsApp não impede a criação da demanda.
      if (!input.id && input.assigned_to) {
        try {
          await sendDemandWhatsAppNotification({
            data: {
              assignedTo: input.assigned_to,
              title: demand.title,
              description: demand.description,
              priority: demand.priority,
              dueAt: demand.due_at,
            },
          });
        } catch (error) {
          console.error(
            "[Herval Flow] Não foi possível enviar a notificação da demanda pelo WhatsApp:",
            error,
          );
          toast.warning(
            "Demanda criada, mas não foi possível enviar a notificação pelo WhatsApp.",
          );
        }
      }

      return demand;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["demands"] });
      qc.invalidateQueries({ queryKey: ["demand-events"] });
      toast.success(vars.id ? "Demanda atualizada." : "Demanda criada.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível salvar a demanda.")),
  });
}

export function usePatchDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<Pick<Demand, "status" | "priority" | "assigned_to" | "due_at">>) =>
      assertOk(
        await supabase.from("demands").update(patch).eq("id", id).select().single(),
      ) as Demand,
    onSuccess: (demand) => {
      qc.invalidateQueries({ queryKey: ["demands"] });
      qc.invalidateQueries({ queryKey: ["demand-events", demand.id] });
      toast.success("Demanda atualizada.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível atualizar a demanda.")),
  });
}

/** Exclusão segura: arquiva preservando o histórico. */
export function useArchiveDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      return assertOk(
        await supabase
          .from("demands")
          .update({
            archived_at: archived ? new Date().toISOString() : null,
            archived_by: archived ? (userData.user?.id ?? null) : null,
          })
          .eq("id", id)
          .select()
          .single(),
      ) as Demand;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["demands"] });
      toast.success(
        vars.archived ? "Demanda arquivada (histórico preservado)." : "Demanda restaurada.",
      );
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível arquivar a demanda.")),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ demandId, body }: { demandId: string; body: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      return assertOk(
        await supabase
          .from("demand_comments")
          .insert({ demand_id: demandId, body: body.trim(), author_id: userData.user?.id ?? null })
          .select()
          .single(),
      ) as DemandComment;
    },
    onSuccess: (comment) => {
      qc.invalidateQueries({ queryKey: ["demand-comments", comment.demand_id] });
      qc.invalidateQueries({ queryKey: ["demand-events", comment.demand_id] });
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível enviar o comentário.")),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: DemandComment) => {
      const { error } = await supabase.from("demand_comments").delete().eq("id", comment.id);
      if (error) throw error;
      return comment;
    },
    onSuccess: (comment) => {
      qc.invalidateQueries({ queryKey: ["demand-comments", comment.demand_id] });
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível remover o comentário.")),
  });
}

/* ---------------------------- EXCLUSÃO & APROVAÇÃO ---------------------------- */

export type DeletionRequest = Database["public"]["Tables"]["deletion_requests"]["Row"];

export type DeletionRequestWithRelations = DeletionRequest & {
  demand?: { id: string; title: string; clinic?: { id: string; name: string } | null } | null;
};

/** Exclusão direta executada pelo Gestor/ADM */
export function useDeleteDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (demandId: string) => {
      const { error } = await supabase.from("demands").delete().eq("id", demandId);
      if (error) throw error;
      return demandId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demands"] });
      toast.success("Demanda excluída com sucesso.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível excluir a demanda.")),
  });
}

/** Solicitação de exclusão submetida por usuário CRC */
export function useRequestDemandDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      demandId,
      demandTitle,
      reason,
    }: {
      demandId: string;
      demandTitle: string;
      reason?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado.");
      const result = await supabase
        .from("deletion_requests")
        .insert({
          entity_type: "demand",
          entity_id: demandId,
          demand_id: demandId,
          entity_label: demandTitle,
          reason: reason?.trim() || null,
          status: "pendente",
          requested_by: userData.user.id,
        })
        .select()
        .single();
      return assertOk(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deletion-requests"] });
      toast.info("Exclusão pendente. Aguarde a aprovação do ADM.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível solicitar a exclusão.")),
  });
}

/** Listagem de solicitações de exclusão */
export function useDeletionRequests(options?: { status?: string }) {
  return useQuery({
    queryKey: ["deletion-requests", options?.status ?? "pendente"],
    queryFn: async () => {
      let query = supabase
        .from("deletion_requests")
        .select("*, demand:demands(id, title, clinic:clinics(id, name))")
        .order("created_at", { ascending: false });
      if (options?.status) {
        query = query.eq("status", options.status);
      }
      return assertOk(await query) as DeletionRequestWithRelations[];
    },
  });
}

/** Avaliação de solicitação de exclusão pelo Gestor */
export function useReviewDeletionRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      demandId,
      decision,
    }: {
      requestId: string;
      demandId?: string | null;
      decision: "aprovada" | "rejeitada";
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      if (decision === "aprovada" && demandId) {
        const { error: delErr } = await supabase.from("demands").delete().eq("id", demandId);
        if (delErr) throw delErr;
      }
      const result = await supabase
        .from("deletion_requests")
        .update({
          status: decision,
          reviewed_by: userData.user?.id ?? null,
          reviewed_at: now,
        })
        .eq("id", requestId)
        .select()
        .single();
      return assertOk(result);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["deletion-requests"] });
      qc.invalidateQueries({ queryKey: ["demands"] });
      toast.success(
        vars.decision === "aprovada"
          ? "Solicitação aprovada e demanda excluída."
          : "Solicitação de exclusão recusada.",
      );
    },
    onError: (error) =>
      toast.error(friendlyError(error, "Não foi possível avaliar a solicitação.")),
  });
}
