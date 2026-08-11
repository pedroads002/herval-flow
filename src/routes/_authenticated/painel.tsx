import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Siren, RotateCcw, TrendingUp } from "lucide-react";
import { PageHeader, StatCard, SectionCard, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useAppointments, useFollowUps, useInterventions, useLeads } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_ORDER,
  LEAD_STATUS_TONE,
} from "@/lib/domain";
import { addDays, endOfDay, formatDateTime, formatPercent, relativeDay, startOfDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Herval Flow" },
      { name: "description", content: "Visão diária da operação comercial: agenda, follow-ups e alertas." },
    ],
  }),
  component: PainelPage,
});

type RangeKey = "hoje" | "7d" | "30d";

function PainelPage() {
  const { profile, isGestor } = useAuth();
  const [range, setRange] = useState<RangeKey>("30d");

  const period = useMemo(() => {
    const now = new Date();
    const days = range === "hoje" ? 0 : range === "7d" ? 6 : 29;
    return { from: startOfDay(addDays(now, -days)).toISOString(), to: endOfDay(now).toISOString() };
  }, [range]);

  const today = useMemo(() => {
    const now = new Date();
    return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  }, []);

  const leadsQuery = useLeads({ from: period.from, to: period.to });
  const agendaQuery = useAppointments({ from: today.from, to: today.to });
  const followUpsQuery = useFollowUps({ status: "pendente" });
  const interventionsQuery = useInterventions({ status: "pendente" });

  const leads = leadsQuery.data ?? [];
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const lead of leads) map.set(lead.status, (map.get(lead.status) ?? 0) + 1);
    return map;
  }, [leads]);

  const total = leads.length;
  const attended = counts.get("compareceu") ?? 0;
  const scheduled = (counts.get("agendado") ?? 0) + (counts.get("confirmado") ?? 0) + attended + (counts.get("no_show") ?? 0);
  const conversion = total ? attended / total : 0;
  const showRate = scheduled ? attended / scheduled : 0;

  const overdue = (followUpsQuery.data ?? []).filter(
    (item) => new Date(item.due_at).getTime() < Date.now(),
  );

  return (
    <>
      <PageHeader
        title={`Olá, ${profile?.full_name?.split(" ")[0] ?? "equipe"}`}
        description={
          isGestor
            ? "Comando geral da operação comercial."
            : "Sua fila de trabalho de hoje. Elas movimentam. Você converte."
        }
        actions={
          <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}>
            <TabsList>
              <TabsTrigger value="hoje">Hoje</TabsTrigger>
              <TabsTrigger value="7d">7 dias</TabsTrigger>
              <TabsTrigger value="30d">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Leads no período" value={total} hint="Novos cadastros" />
        <StatCard label="Agendamentos" value={scheduled} hint="Consultas geradas" tone="primary" />
        <StatCard label="Comparecimento" value={formatPercent(showRate)} hint={`${attended} presenças`} />
        <StatCard label="Conversão lead→consulta" value={formatPercent(conversion)} tone="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Agenda de hoje"
          description="Consultas do dia"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/agenda">Ver agenda</Link>
            </Button>
          }
        >
          {agendaQuery.isPending ? (
            <LoadingState />
          ) : agendaQuery.isError ? (
            <ErrorState onRetry={() => void agendaQuery.refetch()} />
          ) : agendaQuery.data.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhuma consulta hoje"
              description="Agende leads qualificados para preencher o dia."
            />
          ) : (
            <ul className="divide-y divide-border">
              {agendaQuery.data.slice(0, 6).map((appointment) => (
                <li key={appointment.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: appointment.lead_id }}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      {appointment.lead?.name ?? "Lead"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(appointment.scheduled_at)} · {appointment.clinic?.name}
                    </p>
                  </div>
                  <StatusBadge
                    label={APPOINTMENT_STATUS_LABEL[appointment.status]}
                    tone={APPOINTMENT_STATUS_TONE[appointment.status]}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Follow-ups pendentes"
          description={`${overdue.length} em atraso`}
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/follow-ups">Ver todos</Link>
            </Button>
          }
        >
          {followUpsQuery.isPending ? (
            <LoadingState />
          ) : followUpsQuery.isError ? (
            <ErrorState onRetry={() => void followUpsQuery.refetch()} />
          ) : followUpsQuery.data.length === 0 ? (
            <EmptyState
              icon={RotateCcw}
              title="Nenhum follow-up pendente"
              description="Toda a fila de retorno está em dia."
            />
          ) : (
            <ul className="divide-y divide-border">
              {followUpsQuery.data.slice(0, 6).map((item) => {
                const late = new Date(item.due_at).getTime() < Date.now();
                return (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: item.lead_id }}
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {item.lead?.name ?? "Lead"}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{item.clinic?.name}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium ${late ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {relativeDay(item.due_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Intervenções abertas"
          description="Casos escalados ao gestor"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/intervencoes">Ver fila</Link>
            </Button>
          }
        >
          {interventionsQuery.isPending ? (
            <LoadingState />
          ) : interventionsQuery.isError ? (
            <ErrorState onRetry={() => void interventionsQuery.refetch()} />
          ) : interventionsQuery.data.length === 0 ? (
            <EmptyState
              icon={Siren}
              title="Nenhuma intervenção aberta"
              description="A operação está fluindo sem gargalos."
            />
          ) : (
            <ul className="divide-y divide-border">
              {interventionsQuery.data.slice(0, 6).map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: item.lead_id }}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      {item.lead?.name ?? "Lead"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{item.clinic?.name}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeDay(item.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Funil do período" description="Distribuição dos leads por etapa">
          {leadsQuery.isPending ? (
            <LoadingState />
          ) : leadsQuery.isError ? (
            <ErrorState onRetry={() => void leadsQuery.refetch()} />
          ) : total === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sem leads no período"
              description="Cadastre um lead para começar a medir o funil."
            />
          ) : (
            <ul className="space-y-2">
              {LEAD_STATUS_ORDER.map((status) => {
                const value = counts.get(status) ?? 0;
                const pct = total ? Math.round((value / total) * 100) : 0;
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
          )}
        </SectionCard>
      </div>
    </>
  );
}
