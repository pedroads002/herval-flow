import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/api";
import type { AppRole } from "@/lib/domain";
import { createTeamMember, resetTeamMemberPassword } from "@/lib/team.functions";

export type NewMemberInput = {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  avatar_url?: string;
  role: AppRole;
};

export function useCreateTeamMember() {
  const qc = useQueryClient();
  const create = useServerFn(createTeamMember);
  return useMutation({
    mutationFn: async (input: NewMemberInput) => create({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      toast.success("Usuário criado com sucesso.");
    },
    onError: (error) =>
      toast.error((error as Error)?.message || "Não foi possível criar o usuário."),
  });
}

export function useResetMemberPassword() {
  const reset = useServerFn(resetTeamMemberPassword);
  return useMutation({
    mutationFn: async (input: { user_id: string; password: string }) => reset({ data: input }),
    onSuccess: () => toast.success("Senha redefinida."),
    onError: (error) => toast.error((error as Error)?.message || "Não foi possível redefinir a senha."),
  });
}

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      full_name?: string;
      phone?: string | null;
      avatar_url?: string | null;
      is_active?: boolean;
      role?: AppRole;
    }) => {
      const { id, role, ...profilePatch } = input;
      if (Object.keys(profilePatch).length) {
        const { error } = await supabase.from("profiles").update(profilePatch).eq("id", id);
        if (error) throw error;
      }
      if (role) {
        const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", id);
        if (delError) throw delError;
        const { error } = await supabase.from("user_roles").insert({ user_id: id, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      toast.success("Usuário atualizado.");
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível atualizar o usuário.")),
  });
}
