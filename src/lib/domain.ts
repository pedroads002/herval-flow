import type { Database } from "@/integrations/supabase/types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];
export type FollowUpStatus = Database["public"]["Enums"]["followup_status"];
export type InterventionReason = Database["public"]["Enums"]["intervention_reason"];
export type InterventionStatus = Database["public"]["Enums"]["intervention_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "novo",
  "em_contato",
  "follow_up",
  "agendado",
  "confirmado",
  "compareceu",
  "no_show",
  "reagendamento",
  "perdido",
  "convertido",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo Lead",
  em_contato: "Em Contato",
  follow_up: "Follow-up",
  agendado: "Agendado",
  confirmado: "Confirmado",
  compareceu: "Compareceu",
  no_show: "No-show",
  reagendamento: "Reagendamento",
  perdido: "Perdido",
  convertido: "Convertido / Venda",
};

/** Tokens semânticos por status (sem cores hardcoded nos componentes). */
export const LEAD_STATUS_TONE: Record<LeadStatus, string> = {
  novo: "border-info/40 bg-info/10 text-info",
  em_contato: "border-border bg-muted text-foreground",
  follow_up: "border-warning/40 bg-warning/10 text-warning",
  agendado: "border-info/40 bg-info/10 text-info",
  confirmado: "border-primary/50 bg-primary/15 text-foreground",
  compareceu: "border-success/40 bg-success/15 text-success",
  no_show: "border-destructive/40 bg-destructive/10 text-destructive",
  reagendamento: "border-warning/40 bg-warning/10 text-warning",
  perdido: "border-border bg-muted text-muted-foreground",
  convertido: "border-primary bg-primary/25 text-foreground",
};

/** Transições válidas do pipeline. */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  novo: ["em_contato", "follow_up", "agendado", "perdido"],
  em_contato: ["follow_up", "agendado", "perdido", "novo"],
  follow_up: ["em_contato", "agendado", "perdido"],
  agendado: ["confirmado", "reagendamento", "no_show", "compareceu", "perdido"],
  confirmado: ["compareceu", "no_show", "reagendamento", "perdido"],
  compareceu: ["convertido", "perdido", "follow_up"],
  no_show: ["reagendamento", "follow_up", "perdido"],
  reagendamento: ["agendado", "confirmado", "perdido"],
  perdido: ["em_contato", "follow_up"],
  convertido: [],
};

export function canTransition(from: LeadStatus, to: LeadStatus) {
  return from === to || LEAD_STATUS_TRANSITIONS[from].includes(to);
}

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  compareceu: "Compareceu",
  no_show: "No-show",
  reagendado: "Reagendado",
  cancelado: "Cancelado",
};

export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, string> = {
  agendado: "border-info/40 bg-info/10 text-info",
  confirmado: "border-primary/50 bg-primary/15 text-foreground",
  compareceu: "border-success/40 bg-success/15 text-success",
  no_show: "border-destructive/40 bg-destructive/10 text-destructive",
  reagendado: "border-warning/40 bg-warning/10 text-warning",
  cancelado: "border-border bg-muted text-muted-foreground",
};

export const FOLLOWUP_STATUS_LABEL: Record<FollowUpStatus, string> = {
  pendente: "Pendente",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const INTERVENTION_REASON_LABEL: Record<InterventionReason, string> = {
  ligacao: "Ligação necessária",
  objecao: "Objeção",
  lead_quente: "Lead quente",
  recuperacao: "Recuperação",
  no_show_importante: "No-show importante",
  outro: "Outro",
};

export const INTERVENTION_STATUS_LABEL: Record<InterventionStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  resolvida: "Resolvida",
  cancelada: "Cancelada",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  gestor: "Gestor Comercial",
  crc: "Estagiária / CRC",
};

export const SPECIALTIES = [
  { value: "odontologia", label: "Odontologia" },
  { value: "estetica", label: "Estética" },
  { value: "estetica_avancada", label: "Estética Avançada" },
] as const;

export const SPECIALTY_LABEL: Record<string, string> = {
  odontologia: "Odontologia",
  estetica: "Estética",
  estetica_avancada: "Estética Avançada",
};

export const LEAD_SOURCES = [
  "Instagram",
  "WhatsApp",
  "Indicação",
  "Tráfego Pago",
  "Google",
  "Presencial",
  "Outro",
];

export const LEAD_EVENT_LABEL: Record<string, string> = {
  lead_created: "Lead criado",
  status_changed: "Status alterado",
  appointment_created: "Agendamento criado",
  appointment_confirmed: "Consulta confirmada",
  appointment_attended: "Comparecimento registrado",
  appointment_no_show: "No-show registrado",
  appointment_rescheduled: "Consulta reagendada",
  follow_up_created: "Follow-up criado",
  follow_up_completed: "Follow-up concluído",
  intervention_requested: "Intervenção solicitada",
  intervention_resolved: "Intervenção resolvida",
  note_added: "Observação adicionada",
  lead_updated: "Dados do lead atualizados",
};
