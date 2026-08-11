import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { PageHeader, StatCard, SectionCard, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { DemandDetailDialog } from "@/components/DemandDialogs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemands, usePatchDemand, type DemandWithRelations } from "@/lib/api-demands";
import { useAuth } from "@/hooks/useAuth";
import {
  DEMAND_PRIORITY_DOT,
  DEMAND_PRIORITY_LABEL,
  DEMAND_PRIORITY_TONE,
  DEMAND_STATUS_LABEL,
  DEMAND_STATUS_ORDER,
  DEMAND_STATUS_TONE,
  isDueToday,
  isOverdue,
  operationalSort,
  type DemandStatus,
} from "@/lib/demands";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/meu-dia")({
  head: () => ({
    meta: [
      { title: "Meu Dia — Herval Flow" },
      { name: "description", content: "Suas prioridades operacionais do dia: urgências, prazos e atrasos." },
      { property: "og:title", content: "Meu Dia — Herval Flow" },
      { property: "og:description", content: "Prioridades do dia da operação comercial." },
    ],
  }),
  component: MeuDiaPage,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function MeuDiaPage() {
  const { user, profile } = useAuth();
  const demandsQuery = useDemands();
  const patch = usePatchDemand();
  const [detail, setDetail] = useState<DemandWithRelations | null>(null);

  const mine = useMemo(
    () => (demandsQuery.data ?? []).filter((demand) => demand.assigned_to === user?.id),
    [demandsQuery.data, user?.id],
  );

  const stats = useMemo(() => {
    const open = mine.filter((d) => d.status !== "concluida");
    return {
      hoje: mine.filter((d) => isDueToday(d) && d.status !== "concluida").length,
      urgentes: open.filter((d) => d.priority === "urgente").length,
      alta: open.filter((d) => d.priority === "alta").length,
      andamento: mine.filter((d) => d.status === "em_andamento").length,
      atrasadas: mine.filter(isOverdue).length,
      concluidas: mine.filter((d) => d.status === "concluida").length,
    };
  }, [mine]);

  const priorities = useMemo(
    () => mine.filter((d) => d.status !== "concluida").sort(operationalSort).slice(0, 20),
    [mine],
  );

  const firstName = (profile?.full_name || "equipe").split(" ")[0];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName} 👋`}
        description="Estas são as suas prioridades operacionais de hoje."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Tarefas de hoje" value={stats.hoje} />
        <StatCard label="Urgentes" value={stats.urgentes} tone="danger" />
        <StatCard label="Alta prioridade" value={stats.alta} tone="warning" />
        <StatCard label="Em andamento" value={stats.andamento} tone="primary" />
        <StatCard label="Atrasadas" value={stats.atrasadas} tone="danger" />
        <StatCard label="Concluídas" value={stats.concluidas} />
      </div>

      <SectionCard title="Prioridades de hoje" description="Atrasadas primeiro, depois por urgência e prazo">
        {demandsQuery.isPending ? (
          <LoadingState />
        ) : demandsQuery.isError ? (
          <ErrorState onRetry={() => void demandsQuery.refetch()} />
        ) : priorities.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Tudo em dia"
            description="Você não tem demandas pendentes no momento."
          />
        ) : (
          <ul className="divide-y divide-border">
            {priorities.map((demand) => {
              const late = isOverdue(demand);
              return (
                <li
                  key={demand.id}
                  className={cn("flex flex-wrap items-center gap-2 py-2.5", late && "bg-destructive/5")}
                >
                  <button
                    onClick={() => setDetail(demand)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Abrir demanda ${demand.title}`}
                  >
                    <p className="truncate text-sm font-medium">
                      {DEMAND_PRIORITY_DOT[demand.priority]} {demand.title}
                    </p>
                    <p className={cn("truncate text-xs", late ? "text-destructive" : "text-muted-foreground")}>
                      {demand.due_at ? `Prazo ${formatDateTime(demand.due_at)}` : "Sem prazo"}
                      {demand.clinic ? ` · ${demand.clinic.name}` : ""}
                    </p>
                  </button>
                  {late ? (
                    <StatusBadge label="Atrasada" tone="border-destructive bg-destructive/15 text-destructive" />
                  ) : (
                    <StatusBadge
                      label={DEMAND_PRIORITY_LABEL[demand.priority]}
                      tone={DEMAND_PRIORITY_TONE[demand.priority]}
                    />
                  )}
                  <StatusBadge
                    label={DEMAND_STATUS_LABEL[demand.status]}
                    tone={DEMAND_STATUS_TONE[demand.status]}
                  />
                  <Select
                    value={demand.status}
                    onValueChange={(value) => patch.mutate({ id: demand.id, status: value as DemandStatus })}
                  >
                    <SelectTrigger className="h-9 w-40 shrink-0" aria-label={`Alterar status de ${demand.title}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEMAND_STATUS_ORDER.map((item) => (
                        <SelectItem key={item} value={item}>
                          {DEMAND_STATUS_LABEL[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <DemandDetailDialog demand={detail} onOpenChange={(open) => !open && setDetail(null)} />
    </>
  );
}
