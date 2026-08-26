export const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});
export const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
export const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
export const longDateFmt = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return dateTimeFmt.format(new Date(value));
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  return timeFmt.format(new Date(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function relativeDay(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return `Hoje, ${timeFmt.format(date)}`;
  if (diff === 1) return `Amanhã, ${timeFmt.format(date)}`;
  if (diff === -1) return `Ontem, ${timeFmt.format(date)}`;
  if (diff < 0) return `Atrasado há ${Math.abs(diff)} dia(s)`;
  return dateTimeFmt.format(date);
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Converte "2026-08-11T14:30" (input datetime-local) em ISO. */
export function localInputToISO(value: string) {
  return new Date(value).toISOString();
}

/** Converte ISO em valor aceito por <input type="datetime-local">. */
export function isoToLocalInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function onlyDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

export function formatPhone(value?: string | null) {
  const digits = onlyDigits(value);
  if (!digits) return "—";
  if (digits.length === 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value ?? "—";
}

export function normalizeInstagram(value?: string | null) {
  const raw = (value ?? "").trim().replace(/^@/, "").replace(/\/+$/, "");
  return raw ? raw.toLowerCase() : "";
}
