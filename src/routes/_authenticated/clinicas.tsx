import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Plus, Pencil } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useClinics, useSaveClinic, useToggleClinic, type Clinic } from "@/lib/api";
import { SPECIALTIES, SPECIALTY_LABEL } from "@/lib/domain";
import { formatPhone } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/clinicas")({
  head: () => ({
    meta: [
      { title: "Clínicas — Herval Flow" },
      { name: "description", content: "Cadastro e gestão das clínicas atendidas pela operação." },
    ],
  }),
  component: ClinicasPage,
});

type FormState = {
  id?: string;
  name: string;
  responsible_professional: string;
  specialty: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  notes: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  responsible_professional: "",
  specialty: "odontologia",
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "",
  notes: "",
  is_active: true,
};

function ClinicasPage() {
  const { isGestor } = useAuth();
  const clinicsQuery = useClinics();
  const saveClinic = useSaveClinic();
  const toggleClinic = useToggleClinic();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");

  const openNew = () => {
    setForm(EMPTY);
    setError("");
    setOpen(true);
  };

  const openEdit = (clinic: Clinic) => {
    setForm({
      id: clinic.id,
      name: clinic.name,
      responsible_professional: clinic.responsible_professional ?? "",
      specialty: clinic.specialty,
      phone: clinic.phone ?? "",
      whatsapp: clinic.whatsapp ?? "",
      email: clinic.email ?? "",
      instagram: clinic.instagram ?? "",
      notes: clinic.notes ?? "",
      is_active: clinic.is_active,
    });
    setError("");
    setOpen(true);
  };

  const submit = () => {
    if (form.name.trim().length < 2) {
      setError("Informe o nome da clínica.");
      return;
    }
    saveClinic.mutate(
      { ...form, ...(form.id ? { id: form.id } : {}) },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <>
      <PageHeader
        title="Clínicas"
        description="Unidades atendidas, responsáveis e especialidades."
        actions={
          isGestor ? (
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Nova clínica
            </Button>
          ) : undefined
        }
      />

      {clinicsQuery.isPending ? (
        <LoadingState />
      ) : clinicsQuery.isError ? (
        <ErrorState onRetry={() => void clinicsQuery.refetch()} />
      ) : clinicsQuery.data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma clínica cadastrada"
          description="Cadastre a primeira clínica para começar a registrar leads."
          {...(isGestor
            ? {
                action: (
                  <Button onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" /> Nova clínica
                  </Button>
                ),
              }
            : {})}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clinicsQuery.data.map((clinic) => (
            <article
              key={clinic.id}
              className="rounded-lg border border-border bg-card p-4 shadow-panel"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{clinic.name}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {SPECIALTY_LABEL[clinic.specialty] ?? clinic.specialty}
                    {clinic.responsible_professional ? ` · ${clinic.responsible_professional}` : ""}
                  </p>
                </div>
                <StatusBadge
                  label={clinic.is_active ? "Ativa" : "Inativa"}
                  tone={
                    clinic.is_active
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground"
                  }
                />
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="truncate">Telefone: {formatPhone(clinic.phone) || "—"}</div>
                <div className="truncate">E-mail: {clinic.email || "—"}</div>
                <div className="truncate">
                  Instagram: {clinic.instagram ? `@${clinic.instagram}` : "—"}
                </div>
              </dl>
              {isGestor ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(clinic)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={toggleClinic.isPending}
                    onClick={() =>
                      toggleClinic.mutate({ id: clinic.id, is_active: !clinic.is_active })
                    }
                  >
                    {clinic.is_active ? "Desativar" : "Reativar"}
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar clínica" : "Nova clínica"}</DialogTitle>
            <DialogDescription>Dados da unidade atendida pela Herval Marketing.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="clinic-name">Nome da clínica *</Label>
              <Input
                id="clinic-name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="clinic-resp">Profissional responsável</Label>
              <Input
                id="clinic-resp"
                value={form.responsible_professional}
                onChange={(e) =>
                  setForm((s) => ({ ...s, responsible_professional: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Especialidade</Label>
              <Select
                value={form.specialty}
                onValueChange={(value) => setForm((s) => ({ ...s, specialty: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="clinic-phone">Telefone</Label>
                <Input
                  id="clinic-phone"
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="clinic-whats">WhatsApp</Label>
                <Input
                  id="clinic-whats"
                  value={form.whatsapp}
                  onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="clinic-email">E-mail</Label>
                <Input
                  id="clinic-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="clinic-ig">Instagram</Label>
                <Input
                  id="clinic-ig"
                  value={form.instagram}
                  onChange={(e) => setForm((s) => ({ ...s, instagram: e.target.value }))}
                  placeholder="@clinica"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="clinic-notes">Observações</Label>
              <Textarea
                id="clinic-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label htmlFor="clinic-active" className="text-sm font-normal">
                Clínica ativa
              </Label>
              <Switch
                id="clinic-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((s) => ({ ...s, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saveClinic.isPending}>
              {saveClinic.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
