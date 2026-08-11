import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Download } from "lucide-react";
import { PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, GestorOnly, LoadingState } from "@/components/States";
import { useClinics, useLeads, useTeam } from "@/lib/api";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER, LEAD_STATUS_TONE } from "@/lib/domain";
import { addDays, endOfDay, formatDate, formatPercent, startOfDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Herval Flow" },
      { name: "description", content: "Indicadores de conversão, comparecimento e desempenho por clínica." },
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

  const period = useMemo(() => {
    const now = new Date();
    const days = range === "7d" ? 6 : range === "30d" ? 29 : 89;
    return {
      from: startOfDay(addDays(now, -days)).toISOString(),
      to: endOfDay(now).toISOString(),
    };
  }, [range]);

  const leadsQuery = useLeads(period);
  const leads = leadsQuery.data ?? [];

  const totals = useMemo(() => {
    const byStatus = new Map<string, number>();
    for (const lead of leads) byStatus.set(lead.status, (byStatus.get(lead.status) ?? 0) + 1);
    const attended = byStatus.get("compareceu") ?? 0;
    const converted = byStatus.get("convertido") ?? 0;
    const scheduled =
      (byStatus.get("agendado") ?? 0) +
      (byStatus.get("confirmado") ?? 0) +
      attended +
      converted +
      (byStatus.get("no_show") ?? 0);
    return { byStatus, attended, converted, scheduled, total: leads.length };
  }, [leads]);

  const byClinic = useMemo(() => {
    const map = new Map<string, { name: string; total: number; scheduled: number; attended: number }>();
    for (const lead of leads) {
      const key = lead.clinic?.id ?? "sem";
      const entry = map.get(key) ?? {
        name: lead.clinic?.name ?? "Sem clínica",
        total: 0,
        scheduled: 0,
        attended: 0,
      };
      entry.total += 1;
      if (["agendado", "confirmado", "compareceu", "no_show", "convertido"].includes(lead.status))
        entry.scheduled += 1;
      if (lead.status === "compareceu" || lead.status === "convertido") entry.attended += 1;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [leads]);

  const byCrc = useMemo(() => {
    const names = new Map((team.data ?? []).map((member) => [member.id, member.full_name]));
    const map = new Map<string, { name: string; total: number; attended: number }>();
    for (const lead of leads) {
      const key = lead.assigned_to ?? "sem";
      const entry = map.get(key) ?? {
        name: names.get(key) ?? "Não atribuído",
        total: 0,
        attended: 0,
      };
      entry.total += 1;
      if (lead.status === "compareceu" || lead.status === "convertido") entry.attended += 1;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [leads, team.data]);

  const exportCsv = () => {
    const header = ["Nome", "Clínica", "Status", "Origem", "Telefone", "Instagram", "Criado em"];
    const rows = leads.map((lead) => [
      lead.name,
      lead.clinic?.name ?? "",
      LEAD_STATUS_LABEL[lead.status],
      lead.source ?? "",
      lead.phone ?? "",
      lead.instagram ?? "",
      formatDate(lead.created_at),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `herval-flow-leads-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Desempenho comercial consolidado do período."
        actions={
          <>
            <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}>
              <TabsList>
                <TabsTrigger value="7d">7 dias</TabsTrigger>
                <TabsTrigger value="30d">30 dias</TabsTrigger>
                <TabsTrigger value="90d">90 dias</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={exportCsv} disabled={leads.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
          </>
        }
      />

      {leadsQuery.isPending ? (
        <LoadingState />
      ) : leadsQuery.isError ? (
        <ErrorState onRetry={() => void leadsQuery.refetch()} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados no período"
          description="Selecione um período maior ou cadastre novos leads."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Leads" value={totals.total} />
            <StatCard label="Agendamentos" value={totals.scheduled} tone="primary" />
            <StatCard
              label="Taxa de agendamento"
              value={formatPercent(totals.total ? totals.scheduled / totals.total : 0)}
            />
            <StatCard
              label="Taxa de comparecimento"
              value={formatPercent(totals.scheduled ? totals.attended / totals.scheduled : 0)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Funil por etapa">
              <ul className="space-y-2">
                {LEAD_STATUS_ORDER.map((status) => {
                  const value = totals.byStatus.get(status) ?? 0;
                  const pct = totals.total ? Math.round((value / totals.total) * 100) : 0;
                  return (
                    <li key={status} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <StatusBadge label={LEAD_STATUS_LABEL[status]} tone={LEAD_STATUS_TONE[status]} />
                        <span className="tabular text-muted-foreground">
                          {value} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard title="Desempenho por clínica" description={`${clinics.data?.length ?? 0} clínicas`}>
              <ul className="space-y-2 text-sm">
                {byClinic.map((row) => (
                  <li key={row.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <span className="truncate">{row.name}</span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {row.total} leads · {row.scheduled} agend. ·{" "}
                      {formatPercent(row.scheduled ? row.attended / row.scheduled : 0)} presença
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard title="Desempenho por CRC" className="lg:col-span-2">
              <ul className="space-y-2 text-sm">
                {byCrc.map((row) => (
                  <li key={row.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <span className="truncate">{row.name}</span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {row.total} leads · {formatPercent(row.total ? row.attended / row.total : 0)} conversão
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
