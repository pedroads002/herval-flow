import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Siren } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useClinics, useInterventions, useResolveIntervention } from "@/lib/api";
import { INTERVENTION_REASON_LABEL, INTERVENTION_STATUS_LABEL } from "@/lib/domain";
import { formatDateTime, relativeDay } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/intervencoes")({
  head: () => ({
    meta: [
      { title: "Intervenção do Gestor — Herval Flow" },
      { name: "description", content: "Fila de casos escalados para o gestor comercial resolver." },
    ],
  }),
  component: InterventionsPage,
});

function InterventionsPage() {
  const { isGestor } = useAuth();
  const [status, setStatus] = useState("pendente");
  const [clinicId, setClinicId] = useState("todos");
  const [reason, setReason] = useState("todos");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const clinics = useClinics();
  const query = useInterventions({ status, clinicId, reason });
  const resolve = useResolveIntervention();

  const rows = query.data ?? [];

  return (
    <>
      <PageHeader
        title="Intervenção do Gestor"
        description={
          isGestor
            ? "Casos escalados pela CRC aguardando sua decisão."
            : "Acompanhe os casos que você escalou para o gestor."
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Nesta visão" value={rows.length} />
        <StatCard label="Abertas" value={rows.filter((r) => r.status === "pendente").length} tone="danger" />
        <StatCard
          label="Em andamento"
          value={rows.filter((r) => r.status === "em_andamento").length}
          tone="warning"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(INTERVENTION_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger aria-label="Filtrar por motivo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os motivos</SelectItem>
            {Object.entries(INTERVENTION_REASON_LABEL).map(([value, label]) => (
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
          icon={Siren}
          title="Nenhuma intervenção nesta visão"
          description="Quando a CRC escalar um caso, ele aparecerá aqui."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-card px-4 py-3 shadow-panel">
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
                    {INTERVENTION_REASON_LABEL[item.reason]} · {item.clinic?.name} ·{" "}
                    {formatDateTime(item.created_at)}
                  </p>
                  {item.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  ) : null}
                  {item.resolution_notes ? (
                    <p className="mt-1 text-xs">
                      <span className="font-medium">Desfecho:</span> {item.resolution_notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge
                    label={INTERVENTION_STATUS_LABEL[item.status]}
                    tone={
                      item.status === "pendente"
                        ? "border-destructive/40 text-destructive"
                        : item.status === "em_andamento"
                          ? "border-warning/40 text-warning"
                          : "border-border text-muted-foreground"
                    }
                  />
                  <span className="text-[11px] text-muted-foreground">{relativeDay(item.created_at)}</span>
                </div>
              </div>

              {isGestor && item.status !== "resolvida" && item.status !== "cancelada" ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Registre o desfecho da intervenção..."
                    value={notesById[item.id] ?? ""}
                    onChange={(e) => setNotesById((s) => ({ ...s, [item.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    {item.status === "pendente" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolve.isPending}
                        onClick={() =>
                          resolve.mutate({
                            intervention: item,
                            status: "em_andamento",
                            ...(notesById[item.id] ? { resolution_notes: notesById[item.id] } : {}),
                          })
                        }
                      >
                        Assumir
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={resolve.isPending}
                      onClick={() =>
                        resolve.mutate({
                          intervention: item,
                          status: "resolvida",
                          ...(notesById[item.id] ? { resolution_notes: notesById[item.id] } : {}),
                        })
                      }
                    >
                      Resolver
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={resolve.isPending}
                      onClick={() =>
                        resolve.mutate({
                          intervention: item,
                          status: "cancelada",
                          ...(notesById[item.id] ? { resolution_notes: notesById[item.id] } : {}),
                        })
                      }
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
