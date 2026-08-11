import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Plus, Tags } from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { DemandDetailDialog, DemandFormDialog, TagManagerDialog } from "@/components/DemandDialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useArchiveDemand,
  useDemands,
  usePatchDemand,
  useTags,
  type DemandWithRelations,
} from "@/lib/api-demands";
import { useClinics, useTeam } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  DEMAND_PRIORITY_DOT,
  DEMAND_PRIORITY_LABEL,
  DEMAND_PRIORITY_ORDER,
  DEMAND_PRIORITY_TONE,
  DEMAND_STATUS_LABEL,
  DEMAND_STATUS_ORDER,
  DEMAND_STATUS_TONE,
  isDueToday,
  isOverdue,
  operationalSort,
  type DemandPriority,
  type DemandStatus,
} from "@/lib/demands";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/demandas")({
  head: () => ({
    meta: [
      { title: "Demandas — Herval Flow" },
      { name: "description", content: "Gestão operacional de demandas: responsáveis, prazos e prioridades." },
      { property: "og:title", content: "Demandas — Herval Flow" },
      { property: "og:description", content: "Gestão operacional de demandas da equipe comercial." },
    ],
  }),
  component: DemandasPage,
});

type QuickFilter = "todas" | "hoje" | "proximas" | "concluidas" | "atrasadas" | "arquivadas";
type SortKey = "operacional" | "prazo" | "prioridade" | "criacao" | "status" | "responsavel";

function DemandasPage() {
  const { isGestor, user } = useAuth();
  const [quick, setQuick] = useState<QuickFilter>("todas");
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("todos");
  const [clinicId, setClinicId] = useState("todos");
  const [priority, setPriority] = useState<DemandPriority | "todos">("todos");
  const [status, setStatus] = useState<DemandStatus | "todos">("todos");
  const [tagId, setTagId] = useState("todos");
  const [sort, setSort] = useState<SortKey>("operacional");
  const [formOpen, setFormOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [editing, setEditing] = useState<DemandWithRelations | null>(null);
  const [detail, setDetail] = useState<DemandWithRelations | null>(null);

  const demandsQuery = useDemands({ includeArchived: quick === "arquivadas" });
  const { data: team = [] } = useTeam();
  const { data: clinics = [] } = useClinics();
  const { data: tags = [] } = useTags();
  const patch = usePatchDemand();
  const archive = useArchiveDemand();

  const nameOf = (id?: string | null) =>
    (id ? team.find((member) => member.id === id)?.full_name : null) || "Sem responsável";

  const all = demandsQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = all.filter((demand) => {
      if (quick === "arquivadas" && !demand.archived_at) return false;
      if (quick !== "arquivadas" && demand.archived_at) return false;
      if (quick === "hoje" && !isDueToday(demand)) return false;
      if (quick === "atrasadas" && !isOverdue(demand)) return false;
      if (quick === "concluidas" && demand.status !== "concluida") return false;
      if (quick === "proximas") {
        if (!demand.due_at || demand.status === "concluida") return false;
        const due = new Date(demand.due_at).getTime();
        if (due < Date.now() || due > Date.now() + 7 * 86400000) return false;
      }
      if (assignee !== "todos" && demand.assigned_to !== assignee) return false;
      if (clinicId !== "todos" && demand.clinic_id !== clinicId) return false;
      if (priority !== "todos" && demand.priority !== priority) return false;
      if (status !== "todos" && demand.status !== status) return false;
      if (tagId !== "todos" && !demand.demand_tags.some((row) => row.tag?.id === tagId)) return false;
      if (term && !`${demand.title} ${demand.description ?? ""}`.toLowerCase().includes(term)) return false;
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "prazo") {
        const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      }
      if (sort === "prioridade") {
        return DEMAND_PRIORITY_ORDER.indexOf(a.priority) - DEMAND_PRIORITY_ORDER.indexOf(b.priority);
      }
      if (sort === "criacao") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "status") {
        return DEMAND_STATUS_ORDER.indexOf(a.status) - DEMAND_STATUS_ORDER.indexOf(b.status);
      }
      if (sort === "responsavel") return nameOf(a.assigned_to).localeCompare(nameOf(b.assigned_to));
      return operationalSort(a, b);
    });
    return rows;
  }, [all, quick, search, assignee, clinicId, priority, status, tagId, sort, team]);

  const active = all.filter((d) => !d.archived_at);
  const stats = {
    total: active.length,
    pendentes: active.filter((d) => d.status === "a_fazer").length,
    andamento: active.filter((d) => d.status === "em_andamento").length,
    concluidas: active.filter((d) => d.status === "concluida").length,
    atrasadas: active.filter(isOverdue).length,
  };

  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "hoje", label: "Hoje" },
    { key: "proximas", label: "Próximas" },
    { key: "atrasadas", label: "Atrasadas" },
    { key: "concluidas", label: "Concluídas" },
    ...(isGestor ? ([{ key: "arquivadas", label: "Arquivadas" }] as const) : []),
  ];

  return (
    <>
      <PageHeader
        title="Demandas"
        description="O que precisa ser executado, por quem e até quando."
        actions={
          <>
            {isGestor ? (
              <Button variant="outline" onClick={() => setTagsOpen(true)}>
                <Tags className="mr-2 h-4 w-4" /> Etiquetas
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova demanda
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="A fazer" value={stats.pendentes} />
        <StatCard label="Em andamento" value={stats.andamento} tone="primary" />
        <StatCard label="Concluídas" value={stats.concluidas} />
        <StatCard label="Atrasadas" value={stats.atrasadas} tone="danger" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quickFilters.map((item) => (
          <button
            key={item.key}
            onClick={() => setQuick(item.key)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              quick === item.key
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar demanda..."
          aria-label="Buscar demanda"
        />
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger aria-label="Responsável">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os responsáveis</SelectItem>
            {team.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clinicId} onValueChange={setClinicId}>
          <SelectTrigger aria-label="Clínica">
            <SelectValue placeholder="Clínica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as clínicas</SelectItem>
            {clinics.map((clinic) => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(value) => setPriority(value as DemandPriority | "todos")}>
          <SelectTrigger aria-label="Prioridade">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as prioridades</SelectItem>
            {DEMAND_PRIORITY_ORDER.map((item) => (
              <SelectItem key={item} value={item}>
                {DEMAND_PRIORITY_DOT[item]} {DEMAND_PRIORITY_LABEL[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(value) => setStatus(value as DemandStatus | "todos")}>
          <SelectTrigger aria-label="Status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {DEMAND_STATUS_ORDER.map((item) => (
              <SelectItem key={item} value={item}>
                {DEMAND_STATUS_LABEL[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tagId} onValueChange={setTagId}>
          <SelectTrigger aria-label="Etiqueta">
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as etiquetas</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger aria-label="Ordenar por">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="operacional">Ordem operacional</SelectItem>
            <SelectItem value="prazo">Prazo</SelectItem>
            <SelectItem value="prioridade">Prioridade</SelectItem>
            <SelectItem value="criacao">Data de criação</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="responsavel">Responsável</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {demandsQuery.isPending ? (
        <LoadingState />
      ) : demandsQuery.isError ? (
        <ErrorState onRetry={() => void demandsQuery.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma demanda encontrada"
          description="Ajuste os filtros ou crie uma nova demanda para a equipe."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((demand) => {
            const late = isOverdue(demand);
            return (
              <li
                key={demand.id}
                className={cn(
                  "rounded-lg border bg-card p-3 shadow-panel",
                  late ? "border-destructive/60 bg-destructive/5" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <button
                    onClick={() => setDetail(demand)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Abrir demanda ${demand.title}`}
                  >
                    <p className="truncate text-sm font-semibold">
                      {DEMAND_PRIORITY_DOT[demand.priority]} {demand.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nameOf(demand.assigned_to)}
                      {demand.clinic ? ` · ${demand.clinic.name}` : ""}
                      {demand.due_at ? ` · Prazo ${formatDateTime(demand.due_at)}` : ""}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {late ? (
                      <StatusBadge label="Atrasada" tone="border-destructive bg-destructive/15 text-destructive" />
                    ) : null}
                    <StatusBadge
                      label={DEMAND_PRIORITY_LABEL[demand.priority]}
                      tone={DEMAND_PRIORITY_TONE[demand.priority]}
                    />
                    <StatusBadge
                      label={DEMAND_STATUS_LABEL[demand.status]}
                      tone={DEMAND_STATUS_TONE[demand.status]}
                    />
                  </div>
                </div>

                {demand.demand_tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {demand.demand_tags.map((row) =>
                      row.tag ? (
                        <span
                          key={row.tag.id}
                          className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {row.tag.name}
                        </span>
                      ) : null,
                    )}
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
                  <Select
                    value={demand.status}
                    onValueChange={(value) => patch.mutate({ id: demand.id, status: value as DemandStatus })}
                  >
                    <SelectTrigger className="h-9" aria-label={`Status de ${demand.title}`}>
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
                  <Select
                    value={demand.priority}
                    onValueChange={(value) =>
                      patch.mutate({ id: demand.id, priority: value as DemandPriority })
                    }
                  >
                    <SelectTrigger className="h-9" aria-label={`Prioridade de ${demand.title}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEMAND_PRIORITY_ORDER.map((item) => (
                        <SelectItem key={item} value={item}>
                          {DEMAND_PRIORITY_DOT[item]} {DEMAND_PRIORITY_LABEL[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isGestor ? (
                    <Select
                      value={demand.assigned_to ?? "sem"}
                      onValueChange={(value) =>
                        patch.mutate({ id: demand.id, assigned_to: value === "sem" ? null : value })
                      }
                    >
                      <SelectTrigger className="h-9" aria-label={`Responsável por ${demand.title}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem">Sem responsável</SelectItem>
                        {team
                          .filter((member) => member.is_active)
                          .map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.full_name || member.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="self-center truncate text-xs text-muted-foreground">
                      {nameOf(demand.assigned_to)}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(demand);
                        setFormOpen(true);
                      }}
                      disabled={!isGestor && demand.assigned_to !== user?.id && demand.created_by !== user?.id}
                    >
                      Editar
                    </Button>
                    {isGestor ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          archive.mutate({ id: demand.id, archived: !demand.archived_at })
                        }
                      >
                        {demand.archived_at ? "Restaurar" : "Arquivar"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DemandFormDialog open={formOpen} onOpenChange={setFormOpen} demand={editing} />
      <DemandDetailDialog
        demand={detail}
        onOpenChange={(open) => !open && setDetail(null)}
        onEdit={(demand) => {
          setDetail(null);
          setEditing(demand);
          setFormOpen(true);
        }}
      />
      <TagManagerDialog open={tagsOpen} onOpenChange={setTagsOpen} />
    </>
  );
}
