import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardList,
  Plus,
  Tags,
  Pencil,
  Trash2,
  AlertTriangle,
  Archive,
  RotateCcw,
  Calendar,
  User,
  Clock,
  Building,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { DemandDetailDialog, DemandFormDialog, TagManagerDialog } from "@/components/DemandDialogs";
import { DemandDeleteDialog } from "@/components/DemandDeleteDialog";
import { DemandDeletionRequestsDialog } from "@/components/DemandDeletionRequestsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useArchiveDemand,
  useDemands,
  usePatchDemand,
  useTags,
  useDeletionRequests,
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
      {
        name: "description",
        content: "Gestão operacional de demandas: responsáveis, prazos e prioridades.",
      },
      { property: "og:title", content: "Demandas — Herval Flow" },
      {
        property: "og:description",
        content: "Gestão operacional de demandas da equipe comercial.",
      },
    ],
  }),
  component: DemandasPage,
});

type QuickFilter = "todas" | "hoje" | "proximas" | "concluidas" | "atrasadas" | "arquivadas";
type SortKey = "operacional" | "prazo" | "prioridade" | "criacao" | "status" | "responsavel";
type DeadlineFilter = "todos" | "hoje" | "proximos_7" | "atrasadas" | "sem_prazo";

function DemandasPage() {
  const { isGestor, user } = useAuth();
  const [quick, setQuick] = useState<QuickFilter>("todas");
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("todos");
  const [createdBy, setCreatedBy] = useState("todos");
  const [clinicId, setClinicId] = useState("todos");
  const [priority, setPriority] = useState<DemandPriority | "todos">("todos");
  const [status, setStatus] = useState<DemandStatus | "todos">("todos");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("todos");
  const [tagId, setTagId] = useState("todos");
  const [sort, setSort] = useState<SortKey>("operacional");

  const [formOpen, setFormOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [editing, setEditing] = useState<DemandWithRelations | null>(null);
  const [deleting, setDeleting] = useState<DemandWithRelations | null>(null);
  const [detail, setDetail] = useState<DemandWithRelations | null>(null);

  const demandsQuery = useDemands({ includeArchived: quick === "arquivadas" });
  const { data: team = [] } = useTeam();
  const { data: clinics = [] } = useClinics();
  const { data: tags = [] } = useTags();
  const { data: pendingRequests = [] } = useDeletionRequests({ status: "pendente" });
  const patch = usePatchDemand();
  const archive = useArchiveDemand();

  const nameOf = useCallback(
    (id?: string | null) =>
      (id ? team.find((member) => member.id === id)?.full_name : null) || "Sem responsável",
    [team],
  );

  const authorNameOf = useCallback(
    (id?: string | null) =>
      (id ? team.find((member) => member.id === id)?.full_name : null) || "Sistema",
    [team],
  );

  const all = demandsQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = all.filter((demand) => {
      // Filtros rápidos
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

      // Filtros multi-critérios
      if (assignee !== "todos") {
        if (assignee === "sem" && demand.assigned_to !== null) return false;
        if (assignee !== "sem" && demand.assigned_to !== assignee) return false;
      }
      if (createdBy !== "todos" && demand.created_by !== createdBy) return false;
      if (clinicId !== "todos" && demand.clinic_id !== clinicId) return false;
      if (priority !== "todos" && demand.priority !== priority) return false;
      if (status !== "todos" && demand.status !== status) return false;
      if (tagId !== "todos" && !demand.demand_tags.some((row) => row.tag?.id === tagId))
        return false;

      // Filtro de prazo detalhado
      if (deadlineFilter === "hoje" && !isDueToday(demand)) return false;
      if (deadlineFilter === "atrasadas" && !isOverdue(demand)) return false;
      if (deadlineFilter === "sem_prazo" && demand.due_at !== null) return false;
      if (deadlineFilter === "proximos_7") {
        if (!demand.due_at || demand.status === "concluida") return false;
        const due = new Date(demand.due_at).getTime();
        if (due < Date.now() || due > Date.now() + 7 * 86400000) return false;
      }

      // Busca por título ou descrição
      if (term && !`${demand.title} ${demand.description ?? ""}`.toLowerCase().includes(term))
        return false;
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "prazo") {
        const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      }
      if (sort === "prioridade") {
        return (
          DEMAND_PRIORITY_ORDER.indexOf(a.priority) - DEMAND_PRIORITY_ORDER.indexOf(b.priority)
        );
      }
      if (sort === "criacao")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "status") {
        return DEMAND_STATUS_ORDER.indexOf(a.status) - DEMAND_STATUS_ORDER.indexOf(b.status);
      }
      if (sort === "responsavel") return nameOf(a.assigned_to).localeCompare(nameOf(b.assigned_to));
      return operationalSort(a, b);
    });
    return rows;
  }, [
    all,
    quick,
    search,
    assignee,
    createdBy,
    clinicId,
    priority,
    status,
    deadlineFilter,
    tagId,
    sort,
    nameOf,
  ]);

  const active = all.filter((d) => !d.archived_at);
  const stats = {
    total: active.length,
    pendentes: active.filter((d) => d.status === "a_fazer").length,
    fazendo: active.filter((d) => d.status === "em_andamento").length,
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
          <div className="flex flex-wrap items-center gap-2">
            {isGestor ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setRequestsOpen(true)}
                  className="relative"
                  aria-label="Solicitações de exclusão"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                  Solicitações
                  {pendingRequests.length > 0 ? (
                    <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.2 text-[11px] font-bold text-destructive-foreground">
                      {pendingRequests.length}
                    </span>
                  ) : null}
                </Button>
                <Button variant="outline" onClick={() => setTagsOpen(true)}>
                  <Tags className="mr-2 h-4 w-4" /> Etiquetas
                </Button>
              </>
            ) : null}
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova demanda
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="A fazer" value={stats.pendentes} />
        <StatCard label="Fazendo" value={stats.fazendo} tone="primary" />
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

      {/* Grade de Filtros Combinados */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar título ou descrição..."
          aria-label="Buscar demanda"
        />

        <Select
          value={status}
          onValueChange={(value) => setStatus(value as DemandStatus | "todos")}
        >
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

        <Select
          value={priority}
          onValueChange={(value) => setPriority(value as DemandPriority | "todos")}
        >
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

        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger aria-label="Responsável">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os responsáveis</SelectItem>
            <SelectItem value="sem">Sem responsável</SelectItem>
            {team.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name || member.email}
                {member.is_active ? "" : " (inativo)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={createdBy} onValueChange={setCreatedBy}>
          <SelectTrigger aria-label="Criado por">
            <SelectValue placeholder="Criado por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Criado por todos</SelectItem>
            {team.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.full_name || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={deadlineFilter}
          onValueChange={(v) => setDeadlineFilter(v as DeadlineFilter)}
        >
          <SelectTrigger aria-label="Prazo de entrega">
            <SelectValue placeholder="Prazo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os prazos</SelectItem>
            <SelectItem value="hoje">Para hoje</SelectItem>
            <SelectItem value="proximos_7">Próximos 7 dias</SelectItem>
            <SelectItem value="atrasadas">Atrasadas</SelectItem>
            <SelectItem value="sem_prazo">Sem prazo definido</SelectItem>
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
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span>
          Exibindo <strong className="text-foreground">{filtered.length}</strong> de{" "}
          <strong className="text-foreground">{all.length}</strong> demandas
        </span>
        <div className="flex items-center gap-1.5">
          <span>Ordenar:</span>
          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger className="h-8 w-44" aria-label="Ordenar por">
              <SelectValue />
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
        <ul className="space-y-2.5">
          {filtered.map((demand) => {
            const late = isOverdue(demand);
            const isCompleted = demand.status === "concluida";
            const assignedMember = team.find((member) => member.id === demand.assigned_to);
            const isAssigneeInactive = Boolean(assignedMember && !assignedMember.is_active);
            const canEdit =
              isGestor || demand.assigned_to === user?.id || demand.created_by === user?.id;

            return (
              <li
                key={demand.id}
                className={cn(
                  "rounded-lg border p-3.5 shadow-panel transition-colors",
                  isCompleted
                    ? "border-border/60 bg-card/60 opacity-85"
                    : late
                      ? "border-destructive/60 bg-destructive/5"
                      : "border-border bg-card",
                )}
              >
                {/* Cabeçalho da Demanda */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    onClick={() => setDetail(demand)}
                    className="min-w-0 flex-1 text-left group"
                    aria-label={`Abrir demanda ${demand.title}`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p
                        className={cn(
                          "text-sm font-semibold text-foreground group-hover:text-primary transition-colors",
                          isCompleted && "line-through text-muted-foreground",
                        )}
                      >
                        {DEMAND_PRIORITY_DOT[demand.priority]} {demand.title}
                      </p>
                      {isAssigneeInactive ? (
                        <span className="inline-flex items-center gap-1 rounded bg-warning/15 border border-warning/30 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                          ⚠️ Responsável desativado
                        </span>
                      ) : null}
                    </div>

                    {/* Metadados Operacionais */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          {nameOf(demand.assigned_to)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        Criada por: {authorNameOf(demand.created_by)}
                      </span>
                      {demand.clinic ? (
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {demand.clinic.name}
                        </span>
                      ) : null}
                      {demand.due_at ? (
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            late && !isCompleted ? "text-destructive font-medium" : "",
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          Prazo: {formatDateTime(demand.due_at)}
                        </span>
                      ) : null}
                      {demand.start_date ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Início: {demand.start_date}
                        </span>
                      ) : null}
                    </div>
                  </button>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {late && !isCompleted ? (
                      <StatusBadge
                        label="Atrasada"
                        tone="border-destructive bg-destructive/15 text-destructive"
                      />
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

                {/* Etiquetas */}
                {demand.demand_tags.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {demand.demand_tags.map((row) =>
                      row.tag ? (
                        <span
                          key={row.tag.id}
                          className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {row.tag.name}
                        </span>
                      ) : null,
                    )}
                  </div>
                ) : null}

                {/* Linha de Controle Rápido & Ações com Ícones */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                    {/* Seletor Rápido de Status (Trabalha Imediatamente) */}
                    <div className="w-36">
                      <Select
                        value={demand.status}
                        onValueChange={(value) =>
                          patch.mutate({ id: demand.id, status: value as DemandStatus })
                        }
                      >
                        <SelectTrigger
                          className="h-8 text-xs"
                          aria-label={`Status de ${demand.title}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEMAND_STATUS_ORDER.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {DEMAND_STATUS_LABEL[item]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Seletor Rápido de Prioridade */}
                    <div className="w-36">
                      <Select
                        value={demand.priority}
                        onValueChange={(value) =>
                          patch.mutate({ id: demand.id, priority: value as DemandPriority })
                        }
                      >
                        <SelectTrigger
                          className="h-8 text-xs"
                          aria-label={`Prioridade de ${demand.title}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEMAND_PRIORITY_ORDER.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {DEMAND_PRIORITY_DOT[item]} {DEMAND_PRIORITY_LABEL[item]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Responsável (Apenas Gestor pode alterar) */}
                    {isGestor ? (
                      <div className="w-44">
                        <Select
                          value={demand.assigned_to ?? "sem"}
                          onValueChange={(value) =>
                            patch.mutate({
                              id: demand.id,
                              assigned_to: value === "sem" ? null : value,
                            })
                          }
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            aria-label={`Responsável por ${demand.title}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem" className="text-xs">
                              Sem responsável
                            </SelectItem>
                            {team
                              .filter(
                                (member) => member.is_active || member.id === demand.assigned_to,
                              )
                              .map((member) => (
                                <SelectItem key={member.id} value={member.id} className="text-xs">
                                  {member.full_name || member.email}
                                  {member.is_active ? "" : " (inativo)"}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>

                  {/* Ações Explícitas: Lápis (Editar) e Lixeira (Excluir com Diálogo) */}
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      title="Editar demanda"
                      aria-label={`Editar ${demand.title}`}
                      onClick={() => {
                        setEditing(demand);
                        setFormOpen(true);
                      }}
                      disabled={!canEdit}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title={isGestor ? "Excluir demanda" : "Solicitar exclusão"}
                      aria-label={`Excluir ${demand.title}`}
                      onClick={() => setDeleting(demand)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Excluir
                    </Button>

                    {isGestor ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title={demand.archived_at ? "Restaurar" : "Arquivar"}
                        onClick={() =>
                          archive.mutate({ id: demand.id, archived: !demand.archived_at })
                        }
                      >
                        {demand.archived_at ? (
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Archive className="h-3.5 w-3.5 mr-1" />
                        )}
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

      {/* Diálogos de Operação */}
      <DemandFormDialog open={formOpen} onOpenChange={setFormOpen} demand={editing} />
      <DemandDetailDialog
        demand={detail}
        onOpenChange={(open) => !open && setDetail(null)}
        onEdit={(demand) => {
          setDetail(null);
          setEditing(demand);
          setFormOpen(true);
        }}
        onDelete={(demand) => {
          setDetail(null);
          setDeleting(demand);
        }}
      />
      <DemandDeleteDialog
        demand={deleting}
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
      <DemandDeletionRequestsDialog open={requestsOpen} onOpenChange={setRequestsOpen} />
      <TagManagerDialog open={tagsOpen} onOpenChange={setTagsOpen} />
    </>
  );
}
