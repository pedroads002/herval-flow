import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/**
 * Client isolado (sem sessão persistida) só para o signUp — evita depender da
 * SUPABASE_SERVICE_ROLE_KEY, ausente em alguns ambientes de deploy.
 */
function createSignupClient() {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(
      `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`,
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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

async function assertGestor(context: { supabase: SupabaseClient; userId: string }) {
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

    const signupClient = createSignupClient();
    const { data: signUpData, error } = await signupClient.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
      },
    });
    if (error) {
      const message = (error.message ?? "").toLowerCase();
      if (
        message.includes("already") ||
        message.includes("já") ||
        message.includes("registered")
      )
        throw new Error("Já existe um usuário com este e-mail.");
      if (
        error.code === "over_email_send_rate_limit" ||
        message.includes("security purposes")
      )
        throw new Error("Aguarde alguns segundos antes de tentar novamente.");
      throw new Error("Não foi possível criar o usuário.");
    }

    // Supabase não retorna erro quando o e-mail já existe e já está confirmado
    // (proteção contra enumeração de e-mail): ele devolve o usuário existente
    // com identities vazio. Sem essa checagem, seguiríamos usando o id de um
    // membro já cadastrado e sobrescreveríamos os dados dele abaixo.
    if (
      !error &&
      signUpData.user &&
      (!signUpData.user.identities || signUpData.user.identities.length === 0)
    ) {
      throw new Error("Já existe um usuário com este e-mail.");
    }

    const userId = signUpData.user?.id;
    if (!userId) throw new Error("Não foi possível criar o usuário.");

    // profiles já é criado pelo trigger handle_new_user (auth.users -> profiles);
    // aqui só completamos os campos que o signUp não preenche.
    const { error: profileError } = await context.supabase
      .from("profiles")
      .update({
        phone: data.phone || null,
        avatar_url: data.avatar_url || null,
        full_name: data.full_name,
      })
      .eq("id", userId);
    if (profileError) throw new Error("Usuário criado, mas o perfil não pôde ser salvo.");

    await context.supabase.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await context.supabase
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
