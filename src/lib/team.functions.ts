import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(30).optional(),
  avatar_url: z.string().trim().max(500).optional(),
  role: z.enum(["gestor", "crc"]),
});

const resetSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(72),
});

async function assertGestor(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "gestor")
    .maybeSingle();
  if (error || !data) throw new Error("Apenas o gestor pode gerenciar usuários.");
}

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertGestor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) {
      const message = error?.message ?? "";
      if (message.toLowerCase().includes("already")) throw new Error("Já existe um usuário com este e-mail.");
      throw new Error("Não foi possível criar o usuário.");
    }

    const userId = created.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      avatar_url: data.avatar_url || null,
      is_active: true,
    });
    if (profileError) throw new Error("Usuário criado, mas o perfil não pôde ser salvo.");

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleError) throw new Error("Usuário criado, mas o papel não pôde ser definido.");

    return { userId };
  });

export const resetTeamMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => resetSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertGestor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error("Não foi possível redefinir a senha.");
    return { ok: true };
  });
