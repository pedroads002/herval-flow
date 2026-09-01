import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download } from "lucide-react";
import { PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, GestorOnly, LoadingState } from "@/components/States";
import { useClinics, useTeam } from "@/lib/api";
import { useDemands } from "@/lib/api-demands";
import {
  DEMAND_PRIORITY_LABEL,
  DEMAND_PRIORITY_ORDER,
  DEMAND_STATUS_LABEL,
  DEMAND_STATUS_ORDER,
  DEMAND_STATUS_TONE,
  isOverdue,
} from "@/lib/demands";
import { addDays, endOfDay, formatDate, formatPercent, startOfDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Herval Flow" },
      {
        name: "description",
        content: "Indicadores de execução, prazos e desempenho das demandas da equipe.",
      },
    ],
  }),
  component: () => (
    <GestorOnly>
      <RelatoriosPage />
    </GestorOnly>
  ),
});

type RangeKey = "7d" | "30d" | "90d";

function RelatoriosPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const clinics = useClinics();
  const team = useTeam();
  const demandsQuery = useDemands({ includeArchived: false });

  const period = useMemo(() => {
    const now = new Date();
    const days = range === "7d" ? 6 : range === "30d" ? 29 : 89;
    return {
      from: startOfDay(addDays(now, -days)).getTime(),
      to: endOfDay(now).getTime(),
    };
  }, [range]);

  const demands = useMemo(() => {
    const all = demandsQuery.data ?? [];
    return all.filter((demand) => {
      const createdAt = new Date(demand.created_at).getTime();
      return createdAt >= period.from && createdAt <= period.to;
    });
  }, [demandsQuery.data, period]);

  const totals = useMemo(() => {
    const byStatus = new Map<string, number>();
    let overdue = 0;
    for (const demand of demands) {
      byStatus.set(demand.status, (byStatus.get(demand.status) ?? 0) + 1);
      if (isOverdue(demand)) overdue += 1;
    }
    const completed = byStatus.get("concluida") ?? 0;
    return { byStatus, completed, overdue, total: demands.length };
  }, [demands]);

  const byPriority = useMemo(() => {
    const map = new Map<string, number>();
    for (const demand of demands) map.set(demand.priority, (map.get(demand.priority) ?? 0) + 1);
    return map;
  }, [demands]);

  const byClinic = useMemo(() => {
    const map = new Map<
      string,
      { name: string; total: number; completed: number; overdue: number }
    >();
    for (const demand of demands) {
      const key = demand.clinic?.id ?? "sem";
      const entry = map.get(key) ?? {
        name: demand.clinic?.name ?? "Sem clínica",
        total: 0,
        completed: 0,
        overdue: 0,
      };
      entry.total += 1;
      if (demand.status === "concluida") entry.completed += 1;
      if (isOverdue(demand)) entry.overdue += 1;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.total - a.total);
  }, [demands]);

  const byResponsavel = useMemo(() => {
    const names = new Map((team.data ?? []).map((member) => [member.id, member.full_name]));
    const map = new Map<
      string,
      { name: string; total: number; completed: number; overdue: number }
    >();
    for (const demand of demands) {
      const name = (demand.assigned_to && names.get(demand.assigned_to)) || "Sem responsável";
      // Agrupa por nome (não por id) para não abrir uma linha separada por
      // demanda cujo responsável não existe mais em "profiles".
      const key = demand.assigned_to && names.has(demand.assigned_to) ? demand.assigned_to : "sem";
      const entry = map.get(key) ?? { name, total: 0, completed: 0, overdue: 0 };
      entry.total += 1;
      if (demand.status === "concluida") entry.completed += 1;
      if (isOverdue(demand)) entry.overdue += 1;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.total - a.total);
  }, [demands, team.data]);

  const exportCsv = () => {
    const header = ["Título", "Clínica", "Responsável", "Status", "Prioridade", "Prazo", "Criada em"];
    const names = new Map((team.data ?? []).map((member) => [member.id, member.full_name]));
    const rows = demands.map((demand) => [
      demand.title,
      demand.clinic?.name ?? "",
      names.get(demand.assigned_to ?? "") ?? "",
      DEMAND_STATUS_LABEL[demand.status],
      DEMAND_PRIORITY_LABEL[demand.priority],
      demand.due_at ? formatDate(demand.due_at) : "",
      formatDate(demand.created_at),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `herval-flow-demandas-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Execução e desempenho da equipe consolidados do período."
        actions={
          <>
            <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}>
              <TabsList>
                <TabsTrigger value="7d">7 dias</TabsTrigger>
                <TabsTrigger value="30d">30 dias</TabsTrigger>
                <TabsTrigger value="90d">90 dias</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={exportCsv} disabled={demands.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </>
        }
      />

      {demandsQuery.isPending ? (
        <LoadingState />
      ) : demandsQuery.isError ? (
        <ErrorState onRetry={() => void demandsQuery.refetch()} />
      ) : demands.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sem demandas no período"
          description="Selecione um período maior ou crie novas demandas para a equipe."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Demandas criadas" value={totals.total} />
            <StatCard label="Concluídas" value={totals.completed} tone="primary" />
            <StatCard
              label="Taxa de conclusão"
              value={formatPercent(totals.total ? totals.completed / totals.total : 0)}
            />
            <StatCard label="Atrasadas" value={totals.overdue} tone="danger" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Funil por status">
              <ul className="space-y-2">
                {DEMAND_STATUS_ORDER.map((status) => {
                  const value = totals.byStatus.get(status) ?? 0;
                  const pct = totals.total ? Math.round((value / totals.total) * 100) : 0;
                  return (
                    <li key={status} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <StatusBadge
                          label={DEMAND_STATUS_LABEL[status]}
                          tone={DEMAND_STATUS_TONE[status]}
                        />
                        <span className="tabular text-muted-foreground">
                          {value} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard title="Distribuição por prioridade">
              <ul className="space-y-2">
                {DEMAND_PRIORITY_ORDER.map((priority) => {
                  const value = byPriority.get(priority) ?? 0;
                  const pct = totals.total ? Math.round((value / totals.total) * 100) : 0;
                  return (
                    <li key={priority} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span>{DEMAND_PRIORITY_LABEL[priority]}</span>
                        <span className="tabular text-muted-foreground">
                          {value} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard
              title="Desempenho por clínica"
              description={`${clinics.data?.length ?? 0} clínicas`}
            >
              <ul className="space-y-2 text-sm">
                {byClinic.map((row) => (
                  <li
                    key={row.key}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                  >
                    <span className="truncate">{row.name}</span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {row.total} demandas · {row.completed} concluídas
                      {row.overdue ? ` · ${row.overdue} atrasadas` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Desempenho por responsável">
              <ul className="space-y-2 text-sm">
                {byResponsavel.map((row) => (
                  <li
                    key={row.key}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                  >
                    <span className="truncate">{row.name}</span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {row.total} demandas ·{" "}
                      {formatPercent(row.total ? row.completed / row.total : 0)} conclusão
                      {row.overdue ? ` · ${row.overdue} atrasadas` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
