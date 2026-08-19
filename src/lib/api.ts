import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { onlyDigits, normalizeInstagram } from "@/lib/format";
import type { AppRole, LeadStatus } from "@/lib/domain";

export type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type FollowUp = Database["public"]["Tables"]["follow_ups"]["Row"];
export type Intervention = Database["public"]["Tables"]["interventions"]["Row"];
export type LeadEvent = Database["public"]["Tables"]["lead_events"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type LeadWithRelations = Lead & { clinic: Pick<Clinic, "id" | "name" | "specialty"> | null };

/** Traduz erros técnicos do banco em mensagens claras em português. */
export function friendlyError(
  error: unknown,
  fallback = "Não foi possível concluir a operação.",
): string {
  const err = error as { code?: string; message?: string; details?: string } | null;
  if (!err) return fallback;
  const message = err.message ?? "";

  if (err.code === "23505" || message.includes("duplicate key")) {
    if (message.includes("appointments_one_active_per_lead")) {
      return "Este lead já possui uma consulta ativa. Reagende ou finalize a consulta existente.";
    }
    if (message.includes("appointments_unique_slot")) return "Esta consulta já foi registrada.";
    if (message.includes("leads_clinic_phone_unique"))
      return "Lead já existente com este telefone nesta clínica.";
    if (message.includes("leads_clinic_instagram_unique"))
      return "Lead já existente com este Instagram nesta clínica.";
    if (message.includes("clinics_name_unique")) return "Já existe uma clínica com este nome.";
    if (message.includes("interventions_one_open_per_lead"))
      return "Já existe uma intervenção em aberto para este lead.";
    return "Registro já existente.";
  }
  if (err.code === "42501" || message.includes("row-level security")) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (err.code === "23503") return "Registro relacionado inválido ou inexistente.";
  if (message.startsWith("Lead neste status"))
    return "Informe a data da consulta antes de avançar este status.";
  if (message.includes("motivo da perda")) return "Informe o motivo da perda.";
  if (message) return fallback;
  return fallback;
}

function assertOk<T>(result: { data: T; error: unknown }) {
  if (result.error) throw result.error;
  return result.data;
}

/* ------------------------------- CLÍNICAS ------------------------------- */

export function useClinics(options?: { onlyActive?: boolean }) {
  return useQuery({
    queryKey: ["clinics"],
    queryFn: async () =>
      assertOk(
        await supabase.from("clinics").select("*").order("name", { ascending: true }),
      ) as Clinic[],
    select: (data) => (options?.onlyActive ? data.filter((c) => c.is_active) : data),
  });
}

export function useSaveClinic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Clinic> & { name: string }) => {
      const payload = {
        name: input.name.trim(),
        responsible_professional: input.responsible_professional?.trim() || null,
        specialty: input.specialty ?? "odontologia",
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        whatsapp: input.whatsapp?.trim() || null,
        instagram: normalizeInstagram(input.instagram) || null,
        notes: input.notes?.trim() || null,
        is_active: input.is_active ?? true,
      };
      if (input.id) {
        return assertOk(
          await supabase.from("clinics").update(payload).eq("id", input.id).select().single(),
        );
      }
      const { data: userData } = await supabase.auth.getUser();
      return assertOk(
        await supabase
          .from("clinics")
          .insert({ ...payload, created_by: userData.user?.id ?? null })
          .select()
          .single(),
      );
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["clinics"] });
      toast.success(vars.id ? "Clínica atualizada." : "Clínica criada com sucesso.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível salvar a clínica.")),
  });
}

export function useToggleClinic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) =>
      assertOk(await supabase.from("clinics").update({ is_active }).eq("id", id).select().single()),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["clinics"] });
      toast.success(vars.is_active ? "Clínica reativada." : "Clínica desativada.");
    },
    onError: (error) =>
      toast.error(friendlyError(error, "Não foi possível alterar o status da clínica.")),
  });
}

/* --------------------------------- LEADS -------------------------------- */

export type LeadFilters = {
  search?: string;
  clinicId?: string;
  status?: LeadStatus | "todos";
  crcId?: string;
  from?: string;
  to?: string;
  interventionOnly?: boolean;
};

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*, clinic:clinics(id, name, specialty)")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.clinicId && filters.clinicId !== "todos")
        query = query.eq("clinic_id", filters.clinicId);
      if (filters.status && filters.status !== "todos") query = query.eq("status", filters.status);
      if (filters.crcId && filters.crcId !== "todos")
        query = query.eq("assigned_to", filters.crcId);
      if (filters.interventionOnly) query = query.eq("intervention_pending", true);
      if (filters.from) query = query.gte("created_at", filters.from);
      if (filters.to) query = query.lte("created_at", filters.to);
      if (filters.search?.trim()) {
        const term = filters.search.trim();
        const digits = onlyDigits(term);
        const parts = [`name.ilike.%${term}%`, `instagram.ilike.%${term.replace(/^@/, "")}%`];
        if (digits) parts.push(`phone.ilike.%${digits}%`, `whatsapp.ilike.%${digits}%`);
        query = query.or(parts.join(","));
      }
      return assertOk(await query) as LeadWithRelations[];
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: async () =>
      assertOk(
        await supabase
          .from("leads")
          .select("*, clinic:clinics(id, name, specialty)")
          .eq("id", id)
          .single(),
      ) as LeadWithRelations,
    enabled: Boolean(id),
  });
}

export function useLeadEvents(leadId: string) {
  return useQuery({
    queryKey: ["lead-events", leadId],
    queryFn: async () =>
      assertOk(
        await supabase
          .from("lead_events")
          .select("*")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false }),
      ) as LeadEvent[],
    enabled: Boolean(leadId),
  });
}

/** Busca possíveis duplicados antes de criar um lead. */
export async function findDuplicateLeads(input: {
  clinicId: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  name?: string;
}) {
  const conditions: string[] = [];
  const phone = onlyDigits(input.phone);
  const whatsapp = onlyDigits(input.whatsapp);
  const instagram = normalizeInstagram(input.instagram);
  if (phone) conditions.push(`phone.eq.${phone}`, `whatsapp.eq.${phone}`);
  if (whatsapp && whatsapp !== phone)
    conditions.push(`phone.eq.${whatsapp}`, `whatsapp.eq.${whatsapp}`);
  if (instagram) conditions.push(`instagram.eq.${instagram}`);
  if (!conditions.length && input.name?.trim()) conditions.push(`name.ilike.${input.name.trim()}`);
  if (!conditions.length) return [] as LeadWithRelations[];

  const { data, error } = await supabase
    .from("leads")
    .select("*, clinic:clinics(id, name, specialty)")
    .eq("clinic_id", input.clinicId)
    .or(conditions.join(","))
    .limit(5);
  if (error) throw error;
  return (data ?? []) as LeadWithRelations[];
}

export async function logEvent(
  leadId: string,
  eventType: string,
  description?: string,
  metadata?: object,
) {
  const { data: userData } = await supabase.auth.getUser();
  await supabase.from("lead_events").insert({
    lead_id: leadId,
    event_type: eventType,
    description: description ?? null,
    metadata: (metadata ?? {}) as never,
    actor_id: userData.user?.id ?? null,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      clinic_id: string;
      name: string;
      phone?: string;
      whatsapp?: string;
      instagram?: string;
      source?: string;
      notes?: string;
      next_follow_up_at?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      return assertOk(
        await supabase
          .from("leads")
          .insert({
            clinic_id: input.clinic_id,
            name: input.name.trim(),
            phone: onlyDigits(input.phone) || null,
            whatsapp: onlyDigits(input.whatsapp || input.phone) || null,
            instagram: normalizeInstagram(input.instagram) || null,
            source: input.source || null,
            notes: input.notes?.trim() || null,
            next_follow_up_at: input.next_follow_up_at || null,
            assigned_to: userData.user?.id ?? null,
            created_by: userData.user?.id ?? null,
            last_interaction_at: new Date().toISOString(),
          })
          .select()
          .single(),
      ) as Lead;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      toast.success("Lead cadastrado com sucesso.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível cadastrar o lead.")),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Lead> & { id: string }) =>
      assertOk(await supabase.from("leads").update(patch).eq("id", id).select().single()) as Lead,
    onSuccess: (lead) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["lead-events", lead.id] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível salvar as alterações.")),
  });
}

/* ------------------------------ AGENDAMENTOS ----------------------------- */

export type AppointmentWithRelations = Appointment & {
  lead: Pick<Lead, "id" | "name" | "phone" | "status" | "assigned_to"> | null;
  clinic: Pick<Clinic, "id" | "name"> | null;
};

export function useAppointments(
  filters: {
    clinicId?: string;
    status?: string;
    from?: string;
    to?: string;
    crcId?: string;
  } = {},
) {
  return useQuery({
    queryKey: ["appointments", filters],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, lead:leads(id, name, phone, status, assigned_to), clinic:clinics(id, name)")
        .order("scheduled_at", { ascending: true })
        .limit(500);
      if (filters.clinicId && filters.clinicId !== "todos")
        query = query.eq("clinic_id", filters.clinicId);
      if (filters.status && filters.status !== "todos")
        query = query.eq("status", filters.status as never);
      if (filters.from) query = query.gte("scheduled_at", filters.from);
      if (filters.to) query = query.lte("scheduled_at", filters.to);
      const rows = assertOk(await query) as AppointmentWithRelations[];
      if (filters.crcId && filters.crcId !== "todos") {
        return rows.filter((row) => row.lead?.assigned_to === filters.crcId);
      }
      return rows;
    },
  });
}

export function useLeadAppointments(leadId: string) {
  return useQuery({
    queryKey: ["appointments", "lead", leadId],
    queryFn: async () =>
      assertOk(
        await supabase
          .from("appointments")
          .select("*")
          .eq("lead_id", leadId)
          .order("scheduled_at", { ascending: false }),
      ) as Appointment[],
    enabled: Boolean(leadId),
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lead_id: string;
      clinic_id: string;
      scheduled_at: string;
      notes?: string;
      rescheduled_from?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const appointment = assertOk(
        await supabase
          .from("appointments")
          .insert({
            lead_id: input.lead_id,
            clinic_id: input.clinic_id,
            scheduled_at: input.scheduled_at,
            notes: input.notes?.trim() || null,
            rescheduled_from: input.rescheduled_from ?? null,
            created_by: userData.user?.id ?? null,
          })
          .select()
          .single(),
      ) as Appointment;

      await supabase
        .from("leads")
        .update({
          status: input.rescheduled_from ? "agendado" : "agendado",
          appointment_at: input.scheduled_at,
          confirmed: false,
          attended: null,
          last_interaction_at: new Date().toISOString(),
        })
        .eq("id", input.lead_id);

      await logEvent(
        input.lead_id,
        input.rescheduled_from ? "appointment_rescheduled" : "appointment_created",
        input.rescheduled_from ? "Consulta reagendada" : "Agendamento criado",
        { scheduled_at: input.scheduled_at },
      );
      return appointment;
    },
    onSuccess: (appointment) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", appointment.lead_id] });
      qc.invalidateQueries({ queryKey: ["lead-events", appointment.lead_id] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      toast.success("Agendamento registrado.");
    },
    onError: (error) =>
      toast.error(friendlyError(error, "Não foi possível registrar o agendamento.")),
  });
}

type AppointmentAction = "confirmar" | "comparecimento" | "no_show" | "cancelar";

export function useAppointmentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appointment,
      action,
    }: {
      appointment: Appointment;
      action: AppointmentAction;
    }) => {
      const now = new Date().toISOString();
      const patch: Partial<Appointment> = {};
      const leadPatch: Partial<Lead> = { last_interaction_at: now };

      if (action === "confirmar") {
        patch.status = "confirmado";
        patch.confirmed_at = now;
        leadPatch.status = "confirmado";
        leadPatch.confirmed = true;
      } else if (action === "comparecimento") {
        patch.status = "compareceu";
        patch.attended_at = now;
        leadPatch.status = "compareceu";
        leadPatch.attended = true;
      } else if (action === "no_show") {
        patch.status = "no_show";
        patch.no_show_at = now;
        leadPatch.status = "no_show";
        leadPatch.attended = false;
      } else {
        patch.status = "cancelado";
      }

      const updated = assertOk(
        await supabase
          .from("appointments")
          .update(patch)
          .eq("id", appointment.id)
          .select()
          .single(),
      ) as Appointment;

      if (action !== "cancelar") {
        const { error } = await supabase
          .from("leads")
          .update(leadPatch)
          .eq("id", appointment.lead_id);
        if (error) throw error;
      }

      const eventMap: Record<AppointmentAction, string> = {
        confirmar: "appointment_confirmed",
        comparecimento: "appointment_attended",
        no_show: "appointment_no_show",
        cancelar: "appointment_cancelled",
      };
      await logEvent(appointment.lead_id, eventMap[action]);
      return updated;
    },
    onSuccess: (appointment) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", appointment.lead_id] });
      qc.invalidateQueries({ queryKey: ["lead-events", appointment.lead_id] });
      qc.invalidateQueries({ queryKey: ["metrics"] });
      toast.success("Consulta atualizada.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível atualizar a consulta.")),
  });
}

/* -------------------------------- FOLLOW-UP ------------------------------ */

export type FollowUpWithRelations = FollowUp & {
  lead: Pick<Lead, "id" | "name" | "phone" | "status"> | null;
  clinic: Pick<Clinic, "id" | "name"> | null;
};

export function useFollowUps(filters: { status?: string; clinicId?: string; crcId?: string } = {}) {
  return useQuery({
    queryKey: ["follow_ups", filters],
    queryFn: async () => {
      let query = supabase
        .from("follow_ups")
        .select("*, lead:leads(id, name, phone, status), clinic:clinics(id, name)")
        .order("due_at", { ascending: true })
        .limit(500);
      if (filters.status && filters.status !== "todos")
        query = query.eq("status", filters.status as never);
      if (filters.clinicId && filters.clinicId !== "todos")
        query = query.eq("clinic_id", filters.clinicId);
      if (filters.crcId && filters.crcId !== "todos")
        query = query.eq("assigned_to", filters.crcId);
      return assertOk(await query) as FollowUpWithRelations[];
    },
  });
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lead_id: string;
      clinic_id: string;
      due_at: string;
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const created = assertOk(
        await supabase
          .from("follow_ups")
          .insert({
            lead_id: input.lead_id,
            clinic_id: input.clinic_id,
            due_at: input.due_at,
            notes: input.notes?.trim() || null,
            assigned_to: userData.user?.id ?? null,
            created_by: userData.user?.id ?? null,
          })
          .select()
          .single(),
      ) as FollowUp;
      await supabase
        .from("leads")
        .update({ next_follow_up_at: input.due_at })
        .eq("id", input.lead_id);
      await logEvent(input.lead_id, "follow_up_created", "Follow-up criado", {
        due_at: input.due_at,
      });
      return created;
    },
    onSuccess: (followUp) => {
      qc.invalidateQueries({ queryKey: ["follow_ups"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", followUp.lead_id] });
      qc.invalidateQueries({ queryKey: ["lead-events", followUp.lead_id] });
      toast.success("Follow-up criado.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível criar o follow-up.")),
  });
}

export function useCompleteFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ followUp, notes }: { followUp: FollowUp; notes?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const updated = assertOk(
        await supabase
          .from("follow_ups")
          .update({
            status: "concluido",
            completed_at: new Date().toISOString(),
            completed_by: userData.user?.id ?? null,
            notes: notes?.trim() || followUp.notes,
          })
          .eq("id", followUp.id)
          .select()
          .single(),
      ) as FollowUp;
      await supabase
        .from("leads")
        .update({ last_interaction_at: new Date().toISOString(), next_follow_up_at: null })
        .eq("id", followUp.lead_id);
      await logEvent(followUp.lead_id, "follow_up_completed", "Follow-up concluído");
      return updated;
    },
    onSuccess: (followUp) => {
      qc.invalidateQueries({ queryKey: ["follow_ups"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", followUp.lead_id] });
      qc.invalidateQueries({ queryKey: ["lead-events", followUp.lead_id] });
      toast.success("Follow-up concluído.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível concluir o follow-up.")),
  });
}

/* ------------------------------ INTERVENÇÕES ----------------------------- */

export type InterventionWithRelations = Intervention & {
  lead: Pick<Lead, "id" | "name" | "phone" | "status"> | null;
  clinic: Pick<Clinic, "id" | "name"> | null;
};

export function useInterventions(
  filters: { status?: string; clinicId?: string; reason?: string } = {},
) {
  return useQuery({
    queryKey: ["interventions", filters],
    queryFn: async () => {
      let query = supabase
        .from("interventions")
        .select("*, lead:leads(id, name, phone, status), clinic:clinics(id, name)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (filters.status && filters.status !== "todos")
        query = query.eq("status", filters.status as never);
      if (filters.clinicId && filters.clinicId !== "todos")
        query = query.eq("clinic_id", filters.clinicId);
      if (filters.reason && filters.reason !== "todos")
        query = query.eq("reason", filters.reason as never);
      return assertOk(await query) as InterventionWithRelations[];
    },
  });
}

export function useRequestIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lead_id: string;
      clinic_id: string;
      reason: Database["public"]["Enums"]["intervention_reason"];
      description?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const created = assertOk(
        await supabase
          .from("interventions")
          .insert({
            lead_id: input.lead_id,
            clinic_id: input.clinic_id,
            reason: input.reason,
            description: input.description?.trim() || null,
            requested_by: userData.user?.id ?? null,
          })
          .select()
          .single(),
      ) as Intervention;
      await supabase.from("leads").update({ intervention_pending: true }).eq("id", input.lead_id);
      await logEvent(input.lead_id, "intervention_requested", "Intervenção solicitada", {
        reason: input.reason,
      });
      return created;
    },
    onSuccess: (intervention) => {
      qc.invalidateQueries({ queryKey: ["interventions"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", intervention.lead_id] });
      qc.invalidateQueries({ queryKey: ["lead-events", intervention.lead_id] });
      toast.success("Intervenção solicitada ao gestor.");
    },
    onError: (error) =>
      toast.error(friendlyError(error, "Não foi possível solicitar a intervenção.")),
  });
}

export function useResolveIntervention() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      intervention,
      status,
      resolution_notes,
    }: {
      intervention: Intervention;
      status: Database["public"]["Enums"]["intervention_status"];
      resolution_notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const closed = status === "resolvida" || status === "cancelada";
      const updated = assertOk(
        await supabase
          .from("interventions")
          .update({
            status,
            resolution_notes: resolution_notes?.trim() || intervention.resolution_notes,
            resolved_by: closed ? (userData.user?.id ?? null) : null,
            resolved_at: closed ? new Date().toISOString() : null,
          })
          .eq("id", intervention.id)
          .select()
          .single(),
      ) as Intervention;
      if (closed) {
        await supabase
          .from("leads")
          .update({ intervention_pending: false })
          .eq("id", intervention.lead_id);
        await logEvent(intervention.lead_id, "intervention_resolved", "Intervenção finalizada", {
          status,
        });
      }
      return updated;
    },
    onSuccess: (intervention) => {
      qc.invalidateQueries({ queryKey: ["interventions"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", intervention.lead_id] });
      qc.invalidateQueries({ queryKey: ["lead-events", intervention.lead_id] });
      toast.success("Intervenção atualizada.");
    },
    onError: (error) =>
      toast.error(friendlyError(error, "Não foi possível atualizar a intervenção.")),
  });
}

/* --------------------------------- EQUIPE -------------------------------- */

export type TeamMember = Profile & { role: AppRole | null };

export function useTeam() {
  return useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const profiles = assertOk(
        await supabase.from("profiles").select("*").order("full_name", { ascending: true }),
      ) as Profile[];
      const roles = assertOk(await supabase.from("user_roles").select("user_id, role")) as {
        user_id: string;
        role: AppRole;
      }[];
      return profiles.map((profile) => ({
        ...profile,
        role: roles.find((r) => r.user_id === profile.id)?.role ?? null,
      })) as TeamMember[];
    },
  });
}

export function useSetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delError) throw delError;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      toast.success("Papel atualizado.");
    },
    onError: (error) =>
      toast.error(friendlyError(error, "Não foi possível alterar o papel do usuário.")),
  });
}
