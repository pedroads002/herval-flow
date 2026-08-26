import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function getEvolutionConfig() {
  const url = process.env["EVOLUTION_API_URL"];
  const key = process.env["EVOLUTION_API_KEY"];

  if (!url || !key) {
    throw new Error(
      "Evolution API não configurada. Verifique EVOLUTION_API_URL e EVOLUTION_API_KEY.",
    );
  }

  return {
    url: url.replace(/\/+$/, ""),
    key,
  };
}

export const getEvolutionConnectionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { url, key } = getEvolutionConfig();

    const response = await fetch(
      `${url}/instance/connectionState/herval-flow`,
      {
        headers: {
          apikey: key,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Evolution API retornou HTTP ${response.status}.`,
      );
    }

    return await response.json();
  });

const sendDemandWhatsAppSchema = z.object({
  assignedTo: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  priority: z.string().min(1),
  dueAt: z.string().nullable().optional(),
});

export const sendDemandWhatsAppNotification = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(sendDemandWhatsAppSchema)
  .handler(async ({ data, context }) => {
    const { url, key } = getEvolutionConfig();

    // Usa o client autenticado do próprio usuário (via requireSupabaseAuth),
    // que já respeita a RLS de "profiles" (SELECT liberado para autenticados).
    // Evita depender da SUPABASE_SERVICE_ROLE_KEY apenas para essa leitura.
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", data.assignedTo)
      .maybeSingle();

    if (profileError) {
      throw new Error(
        `Não foi possível consultar o telefone do responsável: ${profileError.message}`,
      );
    }

    if (!profile?.phone) {
      return {
        sent: false,
        reason: "responsavel_sem_telefone",
      };
    }

    const number = profile.phone.replace(/\D/g, "");

    if (!number) {
      return {
        sent: false,
        reason: "telefone_invalido",
      };
    }

    const priorityLabels: Record<string, string> = {
      baixa: "Baixa",
      media: "Média",
      alta: "Alta",
      urgente: "Urgente",
    };

    const priorityLabel =
      priorityLabels[data.priority] ?? data.priority;

    const dueText = data.dueAt
      ? new Date(data.dueAt).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "America/Sao_Paulo",
        })
      : "Sem prazo definido";

    const message = [
      "🔔 *Nova demanda no Herval Flow*",
      "",
      `👤 *Responsável:* ${profile.full_name}`,
      `📌 *Demanda:* ${data.title}`,
      `🚨 *Prioridade:* ${priorityLabel}`,
      `⏰ *Prazo:* ${dueText}`,
      ...(data.description?.trim()
        ? ["", `📝 *Descrição:* ${data.description.trim()}`]
        : []),
      "",
      "Acesse o Herval Flow para visualizar e executar a demanda.",
    ].join("\n");

    const response = await fetch(
      `${url}/message/sendText/herval-flow`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
        },
        body: JSON.stringify({
          number: number.startsWith("55")
            ? number
            : `55${number}`,
          text: message,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Evolution API retornou HTTP ${response.status}: ${errorText}`,
      );
    }

    return {
      sent: true,
      response: await response.json(),
    };
  });
