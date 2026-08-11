import { useEffect, useMemo, useState } from "react";
import { History, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/Primitives";
import { EmptyState } from "@/components/States";
import { useClinics, useTeam } from "@/lib/api";
import {
  useAddComment,
  useDeleteComment,
  useDemandComments,
  useDemandEvents,
  useDeleteTag,
  useSaveDemand,
  useSaveTag,
  useTags,
  type DemandWithRelations,
} from "@/lib/api-demands";
import {
  DEMAND_EVENT_LABEL,
  DEMAND_PRIORITY_DOT,
  DEMAND_PRIORITY_LABEL,
  DEMAND_PRIORITY_ORDER,
  DEMAND_PRIORITY_TONE,
  DEMAND_STATUS_LABEL,
  DEMAND_STATUS_ORDER,
  DEMAND_STATUS_TONE,
  isOverdue,
  type DemandPriority,
  type DemandStatus,
} from "@/lib/demands";
import { formatDateTime, isoToLocalInput, localInputToISO } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NONE = "__none__";

/* ---------------------------- FORMULÁRIO DEMANDA --------------------------- */

type FormState = {
  title: string;
  description: string;
  assigned_to: string;
  clinic_id: string;
  priority: DemandPriority;
  status: DemandStatus;
  start_date: string;
  due_at: string;
  tagIds: string[];
};

const emptyForm: FormState = {
  title: "",
  description: "",
  assigned_to: "",
  clinic_id: "",
  priority: "media",
  status: "a_fazer",
  start_date: "",
  due_at: "",
  tagIds: [],
};

export function DemandFormDialog({
  open,
  onOpenChange,
  demand,
  defaultAssignee,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demand?: DemandWithRelations | null;
  defaultAssignee?: string;
}) {
  const { data: clinics = [] } = useClinics({ onlyActive: true });
  const { data: team = [] } = useTeam();
  const { data: tags = [] } = useTags({ onlyActive: true });
  const saveDemand = useSaveDemand();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<{ title?: string }>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (demand) {
      setForm({
        title: demand.title,
        description: demand.description ?? "",
        assigned_to: demand.assigned_to ?? "",
        clinic_id: demand.clinic_id ?? "",
        priority: demand.priority,
        status: demand.status,
        start_date: demand.start_date ?? "",
        due_at: isoToLocalInput(demand.due_at),
        tagIds: demand.demand_tags.map((row) => row.tag?.id).filter(Boolean) as string[],
      });
    } else {
      setForm({ ...emptyForm, assigned_to: defaultAssignee ?? "" });
    }
  }, [open, demand, defaultAssignee]);

  const activeMembers = team.filter((member) => member.is_active);

  const submit = async () => {
    if (form.title.trim().length < 3) {
      setErrors({ title: "Informe um título com pelo menos 3 caracteres." });
      return;
    }
    const result = await saveDemand
      .mutateAsync({
        ...(demand ? { id: demand.id } : {}),
        title: form.title,
        description: form.description,
        assigned_to: form.assigned_to || null,
        clinic_id: form.clinic_id || null,
        priority: form.priority,
        status: form.status,
        start_date: form.start_date || null,
        due_at: form.due_at ? localInputToISO(form.due_at) : null,
        tagIds: form.tagIds,
      })
      .catch(() => null);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{demand ? "Editar demanda" : "Nova demanda"}</DialogTitle>
          <DialogDescription>
            Defina responsável, prioridade e prazo para a execução operacional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="demand-title">Título *</Label>
            <Input
              id="demand-title"
              value={form.title}
              maxLength={140}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex.: Confirmar consultas de amanhã"
            />
            {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="demand-desc">Descrição</Label>
            <Textarea
              id="demand-desc"
              value={form.description}
              maxLength={2000}
              rows={3}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Contexto e instruções da execução."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select
                value={form.assigned_to || NONE}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, assigned_to: value === NONE ? "" : value }))
                }
              >
                <SelectTrigger aria-label="Responsável">
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem responsável</SelectItem>
                  {activeMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Clínica</Label>
              <Select
                value={form.clinic_id || NONE}
                onValueChange={(value) => setForm((f) => ({ ...f, clinic_id: value === NONE ? "" : value }))}
              >
                <SelectTrigger aria-label="Clínica">
                  <SelectValue placeholder="Sem clínica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem clínica</SelectItem>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm((f) => ({ ...f, priority: value as DemandPriority }))}
              >
                <SelectTrigger aria-label="Prioridade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEMAND_PRIORITY_ORDER.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {DEMAND_PRIORITY_DOT[priority]} {DEMAND_PRIORITY_LABEL[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((f) => ({ ...f, status: value as DemandStatus }))}
              >
                <SelectTrigger aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEMAND_STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {DEMAND_STATUS_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demand-start">Data</Label>
              <Input
                id="demand-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demand-due">Prazo</Label>
              <Input
                id="demand-due"
                type="datetime-local"
                value={form.due_at}
                onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Etiquetas</Label>
            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma etiqueta ativa cadastrada.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = form.tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          tagIds: selected ? f.tagIds.filter((id) => id !== tag.id) : [...f.tagIds, tag.id],
                        }))
                      }
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={saveDemand.isPending}>
            {saveDemand.isPending ? "Salvando..." : demand ? "Salvar alterações" : "Criar demanda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- DETALHE DA DEMANDA --------------------------- */

export function DemandDetailDialog({
  demand,
  onOpenChange,
  onEdit,
}: {
  demand: DemandWithRelations | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (demand: DemandWithRelations) => void;
}) {
  const { user, isGestor } = useAuth();
  const { data: team = [] } = useTeam();
  const commentsQuery = useDemandComments(demand?.id ?? "");
  const eventsQuery = useDemandEvents(demand?.id ?? "");
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const [body, setBody] = useState("");

  const nameOf = (id?: string | null) =>
    (id ? team.find((member) => member.id === id)?.full_name : null) || "—";

  const send = async () => {
    if (!demand || body.trim().length < 2) return;
    const created = await addComment.mutateAsync({ demandId: demand.id, body }).catch(() => null);
    if (created) setBody("");
  };

  return (
    <Dialog open={Boolean(demand)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {demand ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-left">{demand.title}</DialogTitle>
              <DialogDescription className="text-left">
                Responsável: {nameOf(demand.assigned_to)}
                {demand.clinic ? ` · ${demand.clinic.name}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={`${DEMAND_PRIORITY_DOT[demand.priority]} ${DEMAND_PRIORITY_LABEL[demand.priority]}`}
                tone={DEMAND_PRIORITY_TONE[demand.priority]}
              />
              <StatusBadge
                label={DEMAND_STATUS_LABEL[demand.status]}
                tone={DEMAND_STATUS_TONE[demand.status]}
              />
              {isOverdue(demand) ? (
                <StatusBadge label="Atrasada" tone="border-destructive bg-destructive/15 text-destructive" />
              ) : null}
              {demand.demand_tags.map((row) =>
                row.tag ? (
                  <StatusBadge key={row.tag.id} label={row.tag.name} tone="border-border bg-muted text-muted-foreground" />
                ) : null,
              )}
              {onEdit ? (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => onEdit(demand)}>
                  Editar
                </Button>
              ) : null}
            </div>

            {demand.description ? (
              <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm">
                {demand.description}
              </p>
            ) : null}

            <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Data</dt>
                <dd className="font-medium">{demand.start_date ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Prazo</dt>
                <dd className={cn("font-medium", isOverdue(demand) && "text-destructive")}>
                  {formatDateTime(demand.due_at)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Criada por</dt>
                <dd className="truncate font-medium">{nameOf(demand.created_by)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Concluída em</dt>
                <dd className="font-medium">{formatDateTime(demand.completed_at)}</dd>
              </div>
            </dl>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4" /> Comentários
              </h3>
              {commentsQuery.data && commentsQuery.data.length > 0 ? (
                <ul className="space-y-2">
                  {commentsQuery.data.map((comment) => (
                    <li key={comment.id} className="rounded-md border border-border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-xs font-semibold">
                          {nameOf(comment.author_id)}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatDateTime(comment.created_at)}
                        </span>
                        {comment.author_id === user?.id || isGestor ? (
                          <button
                            aria-label="Remover comentário"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteComment.mutate(comment)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
              )}

              <div className="flex items-end gap-2">
                <Textarea
                  value={body}
                  rows={2}
                  maxLength={1000}
                  aria-label="Novo comentário"
                  placeholder="Escreva um comentário operacional..."
                  onChange={(e) => setBody(e.target.value)}
                />
                <Button onClick={() => void send()} disabled={addComment.isPending || body.trim().length < 2}>
                  Enviar
                </Button>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4" /> Histórico operacional
              </h3>
              {eventsQuery.data && eventsQuery.data.length > 0 ? (
                <ul className="space-y-1.5">
                  {eventsQuery.data.map((event) => (
                    <li key={event.id} className="flex items-start gap-2 text-xs">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <p className="font-medium">
                          {DEMAND_EVENT_LABEL[event.event_type] ?? event.event_type}
                        </p>
                        <p className="text-muted-foreground">
                          {formatDateTime(event.created_at)} · {nameOf(event.actor_id)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Sem registros.</p>
              )}
            </section>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ ETIQUETAS --------------------------------- */

export function TagManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: tags = [] } = useTags();
  const saveTag = useSaveTag();
  const deleteTag = useDeleteTag();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const sorted = useMemo(() => [...tags].sort((a, b) => a.name.localeCompare(b.name)), [tags]);

  const submit = async () => {
    const value = editing?.name ?? name;
    if (value.trim().length < 2) return;
    await saveTag
      .mutateAsync(editing ? { id: editing.id, name: editing.name } : { name })
      .catch(() => null);
    setName("");
    setEditing(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Etiquetas operacionais</DialogTitle>
          <DialogDescription>Crie, renomeie, ative ou remova etiquetas das demandas.</DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="tag-name">{editing ? "Renomear etiqueta" : "Nova etiqueta"}</Label>
            <Input
              id="tag-name"
              value={editing ? editing.name : name}
              maxLength={40}
              onChange={(e) =>
                editing ? setEditing({ ...editing, name: e.target.value }) : setName(e.target.value)
              }
              placeholder="Ex.: CONFIRMAÇÃO"
            />
          </div>
          <Button onClick={() => void submit()} disabled={saveTag.isPending}>
            {editing ? "Salvar" : "Adicionar"}
          </Button>
          {editing ? (
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          ) : null}
        </div>

        {sorted.length === 0 ? (
          <EmptyState title="Nenhuma etiqueta" description="Crie a primeira etiqueta operacional." />
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{tag.name}</span>
                <Switch
                  checked={tag.is_active}
                  aria-label={`Ativar ${tag.name}`}
                  onCheckedChange={(checked) => saveTag.mutate({ id: tag.id, name: tag.name, is_active: checked })}
                />
                <Button size="sm" variant="ghost" onClick={() => setEditing({ id: tag.id, name: tag.name })}>
                  Editar
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover ${tag.name}`}
                  onClick={() => deleteTag.mutate(tag.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
