import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useSetRole, useTeam } from "@/lib/api";
import { ROLE_LABEL, type AppRole } from "@/lib/domain";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Herval Flow" },
      { name: "description", content: "Gestão de acessos e papéis da operação comercial." },
    ],
  }),
  component: EquipePage,
});

function EquipePage() {
  const { isGestor, user } = useAuth();
  const teamQuery = useTeam();
  const setRole = useSetRole();

  return (
    <>
      <PageHeader title="Equipe" description="Papéis e permissões dos usuários do sistema." />

      {teamQuery.isPending ? (
        <LoadingState />
      ) : teamQuery.isError ? (
        <ErrorState onRetry={() => void teamQuery.refetch()} />
      ) : teamQuery.data.length === 0 ? (
        <EmptyState icon={UserCog} title="Nenhum usuário" description="Convide sua equipe para o sistema." />
      ) : (
        <ul className="space-y-2">
          {teamQuery.data.map((member) => (
            <li
              key={member.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-panel"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{member.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              {isGestor && member.id !== user?.id ? (
                <Select
                  value={member.role ?? ""}
                  onValueChange={(value) => setRole.mutate({ userId: member.id, role: value as AppRole })}
                >
                  <SelectTrigger className="w-40 shrink-0" aria-label={`Papel de ${member.full_name}`}>
                    <SelectValue placeholder="Sem papel" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as AppRole[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {member.role ? ROLE_LABEL[member.role] : "Sem papel"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
