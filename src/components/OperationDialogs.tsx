import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
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
import {
  findDuplicateLeads,
  useClinics,
  useCreateAppointment,
  useCreateFollowUp,
  useCreateLead,
  useRequestIntervention,
  type LeadWithRelations,
} from "@/lib/api";
import { INTERVENTION_REASON_LABEL, LEAD_SOURCES } from "@/lib/domain";
import { isoToLocalInput, localInputToISO } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

/* ------------------------------- NOVO LEAD ------------------------------- */

export function NewLeadDialog({
  open,
  onOpenChange,
  defaultClinicId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClinicId?: string;
}) {
  const navigate = useNavigate();
  const { data: clinics = [] } = useClinics({ onlyActive: true });
  const createLead = useCreateLead();

  const [form, setForm] = useState({
    clinic_id: defaultClinicId ?? "",
    name: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    source: "",
    notes: "",
  });
  const [errors, setErrors] = useState<{ clinic_id?: string; name?: string; phone?: string }>({});
  const [duplicates, setDuplicates] = useState<LeadWithRelations[] | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        clinic_id: defaultClinicId ?? "",
        name: "",
        phone: "",
        whatsapp: "",
        instagram: "",
        source: "",
        notes: "",
      });
      setErrors({});
      setDuplicates(null);
    }
  }, [open, defaultClinicId]);

  const validate = () => {
    const next: { clinic_id?: string; name?: string; phone?: string } = {};
    if (!form.clinic_id) next.clinic_id = "Selecione a clínica.";
    if (form.name.trim().length < 2) next.name = "Informe o nome do lead.";
    if (!form.phone.trim() && !form.whatsapp.trim() && !form.instagram.trim()) {
      next.phone = "Informe ao menos telefone, WhatsApp ou Instagram.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (force = false) => {
    if (!validate()) return;
    if (!force) {
      setChecking(true);
      try {
        const found = await findDuplicateLeads({
          clinicId: form.clinic_id,
          phone: form.phone,
          whatsapp: form.whatsapp,
          instagram: form.instagram,
          name: form.name,
        });
        if (found.length) {
          setDuplicates(found);
          setChecking(false);
          return;
        }
      } finally {
        setChecking(false);
      }
    }
    const lead = await createLead.mutateAsync(form).catch(() => null);
    if (lead) {
      onOpenChange(false);
      void navigate({ to: "/leads/$leadId", params: { leadId: lead.id } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Cadastre um lead vinculado a uma clínica ativa.</DialogDescription>
        </DialogHeader>

        {duplicates?.length ? (
          <div className="space-y-3 rounded-md border border-warning/50 bg-warning/10 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden /> Lead já existente.
            </p>
            <ul className="space-y-2">
              {duplicates.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    {lead.name} · {lead.clinic?.name}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      void navigate({ to: "/leads/$leadId", params: { leadId: lead.id } });
                    }}
                  >
                    Abrir
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => setDuplicates(null)}>
                Revisar dados
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void submit(true)}>
                Cadastrar mesmo assim
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="clinic">Clínica *</Label>
            <Select value={form.clinic_id} onValueChange={(v) => setForm((f) => ({ ...f, clinic_id: v }))}>
              <SelectTrigger id="clinic">
                <SelectValue placeholder="Selecione a clínica" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clinic_id ? <p className="text-xs text-destructive">{errors.clinic_id}</p> : null}
            {!clinics.length ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma clínica ativa cadastrada. Peça ao gestor para cadastrar uma clínica.
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome do lead"
              maxLength={120}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
              {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                inputMode="tel"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={form.instagram}
                onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                placeholder="@perfil"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="source">Origem</Label>
              <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void submit(false)} disabled={checking || createLead.isPending}>
            {checking ? "Verificando..." : createLead.isPending ? "Salvando..." : "Cadastrar lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ AGENDAMENTO ------------------------------ */

export function AppointmentDialog({
  open,
  onOpenChange,
  lead,
  rescheduleFrom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: { id: string; clinic_id: string; name: string };
  rescheduleFrom?: string;
}) {
  const createAppointment = useCreateAppointment();
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setScheduledAt(isoToLocalInput(new Date(Date.now() + 3600000).toISOString()));
      setNotes("");
      setError("");
    }
  }, [open]);

  const submit = async () => {
    if (!scheduledAt) {
      setError("Informe a data e a hora da consulta.");
      return;
    }
    const result = await createAppointment
      .mutateAsync({
        lead_id: lead.id,
        clinic_id: lead.clinic_id,
        scheduled_at: localInputToISO(scheduledAt),
        notes,
        ...(rescheduleFrom ? { rescheduled_from: rescheduleFrom } : {}),
      })
      .catch(() => null);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rescheduleFrom ? "Reagendar consulta" : "Agendar consulta"}</DialogTitle>
          <DialogDescription>{lead.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="scheduled">Data e hora *</Label>
            <Input
              id="scheduled"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="appointment-notes">Observações</Label>
            <Textarea
              id="appointment-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={createAppointment.isPending}>
            {createAppointment.isPending ? "Salvando..." : "Confirmar agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- FOLLOW-UP ------------------------------ */

export function FollowUpDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: { id: string; clinic_id: string; name: string };
}) {
  const createFollowUp = useCreateFollowUp();
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setDueAt(isoToLocalInput(tomorrow.toISOString()));
      setNotes("");
      setError("");
    }
  }, [open]);

  const submit = async () => {
    if (!dueAt) {
      setError("Informe a data do follow-up.");
      return;
    }
    const result = await createFollowUp
      .mutateAsync({
        lead_id: lead.id,
        clinic_id: lead.clinic_id,
        due_at: localInputToISO(dueAt),
        notes,
      })
      .catch(() => null);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar follow-up</DialogTitle>
          <DialogDescription>{lead.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="due">Data prevista *</Label>
            <Input id="due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="followup-notes">Observações</Label>
            <Textarea
              id="followup-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={createFollowUp.isPending}>
            {createFollowUp.isPending ? "Salvando..." : "Criar follow-up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- INTERVENÇÃO ----------------------------- */

export function InterventionDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: { id: string; clinic_id: string; name: string };
}) {
  const requestIntervention = useRequestIntervention();
  const [reason, setReason] = useState<Database["public"]["Enums"]["intervention_reason"]>("ligacao");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setReason("ligacao");
      setDescription("");
    }
  }, [open]);

  const submit = async () => {
    const result = await requestIntervention
      .mutateAsync({ lead_id: lead.id, clinic_id: lead.clinic_id, reason, description })
      .catch(() => null);
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar intervenção do gestor</DialogTitle>
          <DialogDescription>{lead.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="reason">Motivo *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INTERVENTION_REASON_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="intervention-description">Contexto para o gestor</Label>
            <Textarea
              id="intervention-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique rapidamente a situação comercial."
              maxLength={1000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={requestIntervention.isPending}>
            {requestIntervention.isPending ? "Enviando..." : "Solicitar intervenção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
