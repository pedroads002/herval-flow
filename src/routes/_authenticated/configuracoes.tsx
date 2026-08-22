import { createFileRoute } from "@tanstack/react-router";

import { Monitor, Moon, Sun, MessageCircle } from "lucide-react";

import { PageHeader, SectionCard } from "@/components/Primitives";

import { useAuth } from "@/hooks/useAuth";

import { useTheme, type Theme } from "@/lib/theme";

import { ROLE_LABEL } from "@/lib/domain";

import { useEvolutionConnectionState } from "@/lib/api-evolution";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Herval Flow" },
      {
        name: "description",
        content: "Preferências de tema, WhatsApp e dados da sua conta no Herval Flow.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Sistema", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
];

function ConfiguracoesPage() {
  const { profile, role } = useAuth();
  const { theme, setTheme } = useTheme();
  const evolution = useEvolutionConnectionState();

  const state = evolution.data?.instance?.state;

  const isConnected = state === "open";

  const statusLabel = evolution.isLoading
    ? "Verificando conexão..."
    : evolution.isError
      ? "Erro de conexão"
      : isConnected
        ? "Conectado"
        : state === "close"
          ? "Desconectado"
          : state
            ? state
            : "Indisponível";

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Preferências pessoais e dados da conta."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Aparência" description="Escolha o tema da interface">
          <div className="flex flex-wrap gap-2">
            {THEMES.map((option) => (
              <Button
                key={option.value}
                variant={theme === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(option.value)}
              >
                <option.icon className="mr-2 h-4 w-4" />
                {option.label}
              </Button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Minha conta" description="Dados do seu perfil">
          <dl className="space-y-2 text-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="truncate font-medium">{profile?.full_name ?? "—"}</dd>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="truncate font-medium">{profile?.email ?? "—"}</dd>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <dt className="text-muted-foreground">Papel</dt>
              <dd className="truncate font-medium">
                {role ? ROLE_LABEL[role] : "Sem papel"}
              </dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="WhatsApp"
          description="Status da conexão com a Evolution API"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <MessageCircle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="font-medium">herval-flow</p>

                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isConnected
                        ? "bg-green-500"
                        : evolution.isError
                          ? "bg-red-500"
                          : "bg-yellow-500"
                    }`}
                  />

                  <span className="text-muted-foreground">
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <span className="text-xs text-muted-foreground">
              Atualização automática
            </span>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

