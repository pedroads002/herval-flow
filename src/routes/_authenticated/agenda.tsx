import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useAppointmentAction, useAppointments, useClinics } from "@/lib/api";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_TONE } from "@/lib/domain";
import { addDays, endOfDay, formatDateTime, startOfDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Herval Flow" },
      {
        name: "description",
        content: "Consultas agendadas, confirmações, comparecimentos e no-shows.",
      },
    ],
  }),
  component: AgendaPage,
});

type RangeKey = "hoje" | "amanha" | "semana";

function AgendaPage() {
  const [range, setRange] = useState<RangeKey>("hoje");
  const [clinicId, setClinicId] = useState("todos");
  const [status, setStatus] = useState("todos");
  const clinics = useClinics();
  const action = useAppointmentAction();

  const period = useMemo(() => {
    const now = new Date();
    if (range === "hoje")
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    if (range === "amanha") {
      const tomorrow = addDays(now, 1);
      return { from: startOfDay(tomorrow).toISOString(), to: endOfDay(tomorrow).toISOString() };
    }
    return { from: startOfDay(now).toISOString(), to: endOfDay(addDays(now, 6)).toISOString() };
  }, [range]);

  const query = useAppointments({ ...period, clinicId, status });
  const rows = query.data ?? [];

  const counts = {
    agendado: rows.filter((r) => r.status === "agendado").length,
    confirmado: rows.filter((r) => r.status === "confirmado").length,
    compareceu: rows.filter((r) => r.status === "compareceu").length,
    no_show: rows.filter((r) => r.status === "no_show").length,
  };

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Consultas por período, com confirmação e registro de presença."
        actions={
          <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}>
            <TabsList>
              <TabsTrigger value="hoje">Hoje</TabsTrigger>
              <TabsTrigger value="amanha">Amanhã</TabsTrigger>
              <TabsTrigger value="semana">7 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Agendadas" value={counts.agendado} />
        <StatCard label="Confirmadas" value={counts.confirmado} tone="primary" />
        <StatCard label="Compareceram" value={counts.compareceu} />
        <StatCard label="No-show" value={counts.no_show} tone="danger" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={clinicId} onValueChange={setClinicId}>
          <SelectTrigger aria-label="Filtrar por clínica">
            <SelectValue placeholder="Clínica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as clínicas</SelectItem>
            {(clinics.data ?? []).map((clinic) => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(APPOINTMENT_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma consulta no período"
          description="Ajuste o período ou agende novas consultas a partir dos leads."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((appointment) => (
            <li
              key={appointment.id}
              className="rounded-lg border border-border bg-card px-4 py-3 shadow-panel"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <Link
                    to="/leads/$leadId"
                    params={{ leadId: appointment.lead_id }}
                    className="block truncate text-sm font-semibold hover:text-primary"
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
              </div>
              {appointment.status === "agendado" || appointment.status === "confirmado" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {appointment.status === "agendado" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={action.isPending}
                      onClick={() => action.mutate({ appointment, action: "confirmar" })}
                    >
                      Confirmar
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ appointment, action: "comparecimento" })}
                  >
                    Compareceu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ appointment, action: "no_show" })}
                  >
                    No-show
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ appointment, action: "cancelar" })}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
