import type { Database } from "@/integrations/supabase/types";

export type DemandPriority = Database["public"]["Enums"]["demand_priority"];
export type DemandStatus = Database["public"]["Enums"]["demand_status"];

export const DEMAND_PRIORITY_ORDER: DemandPriority[] = ["urgente", "alta", "media", "baixa"];

export const DEMAND_PRIORITY_LABEL: Record<DemandPriority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const DEMAND_PRIORITY_DOT: Record<DemandPriority, string> = {
  urgente: "🔴",
  alta: "🟠",
  media: "🟡",
  baixa: "⚪",
};

export const DEMAND_PRIORITY_TONE: Record<DemandPriority, string> = {
  urgente: "border-destructive/50 bg-destructive/10 text-destructive",
  alta: "border-warning/50 bg-warning/10 text-warning",
  media: "border-info/40 bg-info/10 text-info",
  baixa: "border-border bg-muted text-muted-foreground",
};

export const DEMAND_STATUS_ORDER: DemandStatus[] = [
  "a_fazer",
  "em_andamento",
  "concluida",
  "bloqueada",
];

export const DEMAND_STATUS_LABEL: Record<DemandStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Fazendo",
  concluida: "Concluída",
  bloqueada: "Bloqueada",
};

export const DEMAND_STATUS_TONE: Record<DemandStatus, string> = {
  a_fazer: "border-border bg-muted text-foreground",
  em_andamento: "border-info/40 bg-info/10 text-info",
  concluida: "border-border/60 bg-muted/60 text-muted-foreground",
  bloqueada: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const DEMAND_EVENT_LABEL: Record<string, string> = {
  demand_created: "Demanda criada",
  demand_updated: "Demanda editada",
  status_changed: "Status alterado",
  priority_changed: "Prioridade alterada",
  assignee_changed: "Responsável alterado",
  demand_completed: "Demanda concluída",
  demand_archived: "Demanda arquivada",
  demand_restored: "Demanda restaurada",
  comment_added: "Comentário adicionado",
};

/** Uma demanda com prazo vencido e não concluída é considerada atrasada. */
export function isOverdue(demand: { due_at: string | null; status: DemandStatus }) {
  if (!demand.due_at || demand.status === "concluida") return false;
  return new Date(demand.due_at).getTime() < Date.now();
}

export function isDueToday(demand: { due_at: string | null }) {
  if (!demand.due_at) return false;
  const due = new Date(demand.due_at);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

const PRIORITY_WEIGHT: Record<DemandPriority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };

/** Ordena por urgência operacional: atrasadas → prioridade → prazo mais próximo. */
export function operationalSort<
  T extends {
    due_at: string | null;
    status: DemandStatus;
    priority: DemandPriority;
    created_at: string;
  },
>(a: T, b: T) {
  const overdueDiff = Number(isOverdue(b)) - Number(isOverdue(a));
  if (overdueDiff !== 0) return overdueDiff;
  const weight = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  if (weight !== 0) return weight;
  const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
  const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
  if (aDue !== bDue) return aDue - bDue;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}
