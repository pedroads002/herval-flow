import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserCog, Plus } from "lucide-react";
import { PageHeader } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useTeam, type TeamMember } from "@/lib/api";
import { useCreateTeamMember, useResetMemberPassword, useUpdateTeamMember } from "@/lib/api-team";
import { ROLE_LABEL, type AppRole } from "@/lib/domain";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Herval Flow" },
      { name: "description", content: "Gestão de acessos e papéis da operação comercial." },
    ],
  }),
  component: EquipePage,
});

type MemberForm = {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  avatar_url: string;
  role: AppRole;
};

const emptyMember: MemberForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  avatar_url: "",
  role: "crc",
};

function Avatar({ member }: { member: TeamMember }) {
  const initials = (member.full_name || member.email || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={`Foto de ${member.full_name || member.email}`}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
      {initials}
    </span>
  );
}

function EquipePage() {
  const { isGestor, user } = useAuth();
  const teamQuery = useTeam();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const resetPassword = useResetMemberPassword();

  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyMember);
  const [errors, setErrors] = useState<Partial<Record<keyof MemberForm, string>>>({});
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", avatar_url: "", password: "" });

  const submitNew = async () => {
    const next: Partial<Record<keyof MemberForm, string>> = {};
    if (form.full_name.trim().length < 2) next.full_name = "Informe o nome completo.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Informe um e-mail válido.";
    if (form.password.length < 8) next.password = "A senha precisa ter ao menos 8 caracteres.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const created = await createMember
      .mutateAsync({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        avatar_url: form.avatar_url.trim() || undefined,
        role: form.role,
      })
      .catch(() => null);
    if (created) {
      setForm(emptyMember);
      setNewOpen(false);
    }
  };

  const openEdit = (member: TeamMember) => {
    setEditing(member);
    setEditForm({
      full_name: member.full_name,
      phone: member.phone ?? "",
      avatar_url: member.avatar_url ?? "",
      password: "",
    });
  };

  const submitEdit = async () => {
    if (!editing) return;
    if (editForm.full_name.trim().length < 2) return;
    await updateMember
      .mutateAsync({
        id: editing.id,
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
        avatar_url: editForm.avatar_url.trim() || null,
      })
      .catch(() => null);
    if (editForm.password.length >= 8) {
      await resetPassword.mutateAsync({ user_id: editing.id, password: editForm.password }).catch(() => null);
    }
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Equipe"
        description="Crie e gerencie os acessos da operação. Os nomes das CRCs alimentam todo o sistema."
        actions={
          isGestor ? (
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo usuário
            </Button>
          ) : null
        }
      />

      {teamQuery.isPending ? (
        <LoadingState />
      ) : teamQuery.isError ? (
        <ErrorState onRetry={() => void teamQuery.refetch()} />
      ) : teamQuery.data.length === 0 ? (
        <EmptyState icon={UserCog} title="Nenhum usuário" description="Cadastre sua equipe para começar." />
      ) : (
        <ul className="space-y-2">
          {teamQuery.data.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-panel"
            >
              <Avatar member={member} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {member.full_name || "Sem nome"}
                  {member.is_active ? null : (
                    <span className="ml-2 text-xs font-medium text-muted-foreground">(inativo)</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>

              {isGestor && member.id !== user?.id ? (
                <>
                  <Select
                    value={member.role ?? ""}
                    onValueChange={(value) => updateMember.mutate({ id: member.id, role: value as AppRole })}
                  >
                    <SelectTrigger className="w-40 shrink-0" aria-label={`Papel de ${member.full_name}`}>
                      <SelectValue placeholder="Sem papel" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABEL) as AppRole[]).map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={member.is_active}
                      aria-label={`Ativar ${member.full_name}`}
                      onCheckedChange={(checked) =>
                        updateMember.mutate({ id: member.id, is_active: checked })
                      }
                    />
                    <Button size="sm" variant="ghost" onClick={() => openEdit(member)}>
                      Editar
                    </Button>
                  </div>
                </>
              ) : (
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {member.role ? ROLE_LABEL[member.role] : "Sem papel"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Novo usuário */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>Crie um acesso para a equipe operacional.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="member-name">Nome completo *</Label>
              <Input
                id="member-name"
                value={form.full_name}
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
              {errors.full_name ? <p className="text-xs text-destructive">{errors.full_name}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">E-mail *</Label>
              <Input
                id="member-email"
                type="email"
                value={form.email}
                maxLength={255}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-password">Senha inicial *</Label>
              <Input
                id="member-password"
                type="password"
                value={form.password}
                maxLength={72}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              {errors.password ? <p className="text-xs text-destructive">{errors.password}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-phone">Telefone</Label>
              <Input
                id="member-phone"
                value={form.phone}
                maxLength={30}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-avatar">Foto de perfil (URL)</Label>
              <Input
                id="member-avatar"
                value={form.avatar_url}
                maxLength={500}
                placeholder="https://..."
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={form.role} onValueChange={(value) => setForm((f) => ({ ...f, role: value as AppRole }))}>
                <SelectTrigger aria-label="Perfil de acesso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as AppRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void submitNew()} disabled={createMember.isPending}>
              {createMember.isPending ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar usuário */}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Atualize os dados de acesso e o perfil da equipe.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                maxLength={120}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                maxLength={30}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-avatar">Foto de perfil (URL)</Label>
              <Input
                id="edit-avatar"
                value={editForm.avatar_url}
                maxLength={500}
                onChange={(e) => setEditForm((f) => ({ ...f, avatar_url: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-password">Nova senha (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                maxLength={72}
                placeholder="Mínimo de 8 caracteres"
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void submitEdit()} disabled={updateMember.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
