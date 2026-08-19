import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { PageHeader, StatCard } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useClinics, useCompleteFollowUp, useFollowUps } from "@/lib/api";
import { FOLLOWUP_STATUS_LABEL } from "@/lib/domain";
import { formatDateTime, relativeDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — Herval Flow" },
      { name: "description", content: "Fila de retornos programados para reengajar leads." },
    ],
  }),
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const [status, setStatus] = useState("pendente");
  const [clinicId, setClinicId] = useState("todos");
  const clinics = useClinics();
  const query = useFollowUps({ status, clinicId });
  const complete = useCompleteFollowUp();

  const rows = query.data ?? [];
  const overdue = rows.filter(
    (r) => r.status === "pendente" && new Date(r.due_at).getTime() < Date.now(),
  );
  const todayCount = rows.filter(
    (r) => new Date(r.due_at).toDateString() === new Date().toDateString(),
  ).length;

  return (
    <>
      <PageHeader title="Follow-ups" description="Nenhum lead esfria sem retorno programado." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Na fila" value={rows.length} />
        <StatCard label="Vencem hoje" value={todayCount} tone="primary" />
        <StatCard label="Em atraso" value={overdue.length} tone="danger" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(FOLLOWUP_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clinicId} onValueChange={setClinicId}>
          <SelectTrigger aria-label="Filtrar por clínica">
            <SelectValue />
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
      </div>

      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="Nenhum follow-up nesta visão"
          description="Crie follow-ups na página do lead para manter a cadência de contato."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((item) => {
            const late = item.status === "pendente" && new Date(item.due_at).getTime() < Date.now();
            return (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-card px-4 py-3 shadow-panel"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/leads/$leadId"
                      params={{ leadId: item.lead_id }}
                      className="block truncate text-sm font-semibold hover:text-primary"
                    >
                      {item.lead?.name ?? "Lead"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(item.due_at)} · {item.clinic?.name}
                    </p>
                    {item.notes ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.notes}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium ${late ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {relativeDay(item.due_at)}
                  </span>
                </div>
                {item.status === "pendente" ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={complete.isPending}
                      onClick={() => complete.mutate({ followUp: item })}
                    >
                      Marcar como concluído
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
