import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Plus, Search } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useClinics, useLeads, useTeam, type LeadFilters } from "@/lib/api";
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER, LEAD_STATUS_TONE } from "@/lib/domain";
import { formatPhone, relativeDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewLeadDialog } from "@/components/OperationDialogs";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/leads/")({
  head: () => ({
    meta: [
      { title: "Leads — Herval Flow" },
      {
        name: "description",
        content: "Base completa de leads da operação comercial com filtros e busca.",
      },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const { isGestor } = useAuth();
  const [search, setSearch] = useState("");
  const [clinicId, setClinicId] = useState("todos");
  const [status, setStatus] = useState<NonNullable<LeadFilters["status"]>>("todos");
  const [crcId, setCrcId] = useState("todos");
  const [open, setOpen] = useState(false);

  const clinics = useClinics();
  const team = useTeam();
  const filters = useMemo<LeadFilters>(
    () => ({ search, clinicId, status, crcId }),
    [search, clinicId, status, crcId],
  );
  const leadsQuery = useLeads(filters);

  return (
    <>
      <PageHeader
        title="Leads"
        description="Toda a base comercial, com status, origem e responsável."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou @"
            className="pl-9"
            aria-label="Buscar leads"
          />
        </div>
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
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as NonNullable<LeadFilters["status"]>)}
        >
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {LEAD_STATUS_ORDER.map((item) => (
              <SelectItem key={item} value={item}>
                {LEAD_STATUS_LABEL[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isGestor ? (
          <Select value={crcId} onValueChange={setCrcId}>
            <SelectTrigger aria-label="Filtrar por responsável">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os responsáveis</SelectItem>
              {(team.data ?? []).map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {leadsQuery.isPending ? (
        <LoadingState />
      ) : leadsQuery.isError ? (
        <ErrorState onRetry={() => void leadsQuery.refetch()} />
      ) : leadsQuery.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum lead encontrado"
          description="Ajuste os filtros ou cadastre o primeiro lead desta operação."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo Lead
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {leadsQuery.data.map((lead) => (
            <li key={lead.id}>
              <Link
                to="/leads/$leadId"
                params={{ leadId: lead.id }}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-panel transition-colors hover:border-primary/60"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold">{lead.name}</p>
                    {lead.intervention_pending ? (
                      <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive">
                        Intervenção
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {lead.clinic?.name ?? "Sem clínica"}
                    {lead.phone ? ` · ${formatPhone(lead.phone)}` : ""}
                    {lead.instagram ? ` · @${lead.instagram}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge
                    label={LEAD_STATUS_LABEL[lead.status]}
                    tone={LEAD_STATUS_TONE[lead.status]}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {relativeDay(lead.created_at)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <NewLeadDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
