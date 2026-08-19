import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  CalendarDays,
  RotateCcw,
  Siren,
  BarChart3,
  UserCog,
  Settings,
  Plus,
  LogOut,
  Menu,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type Theme } from "@/lib/theme";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/domain";
import { NewLeadDialog } from "@/components/OperationDialogs";
import { useQueryClient } from "@tanstack/react-query";

type NavItem = { to: string; label: string; icon: typeof Users; gestorOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/meu-dia", label: "Meu Dia", icon: Sun },
  { to: "/demandas", label: "Demandas", icon: ClipboardList },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/clinicas", label: "Clínicas", icon: Building2 },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/follow-ups", label: "Follow-ups", icon: RotateCcw },
  { to: "/intervencoes", label: "Intervenção do Gestor", icon: Siren },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, gestorOnly: true },
  { to: "/equipe", label: "Equipe", icon: UserCog, gestorOnly: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const MOBILE_NAV = ["/meu-dia", "/demandas", "/leads", "/intervencoes"];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "system", label: "Sistema", icon: Monitor },
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
  ];
  const Current = options.find((o) => o.value === theme)?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Alterar tema">
          <Current className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            <option.icon className="mr-2 h-4 w-4" />
            {option.label}
            {theme === option.value ? <span className="ml-auto text-primary">•</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { isGestor } = useAuth();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.filter((item) => !item.gestorOnly || isGestor).map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground data-[status=active]:shadow-[inset_2px_0_0_0_var(--primary)]"
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <Button className="w-full" onClick={() => setNewLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navegação</SheetTitle>
              <div className="flex h-14 items-center border-b border-border px-4">
                <Logo />
              </div>
              <div className="p-3">
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="lg:hidden">
            <Logo showWordmark={false} size={24} />
          </div>

          <p className="ml-1 hidden min-w-0 truncate text-sm text-muted-foreground md:block">
            Elas movimentam. Você converte.
          </p>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Conta">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {initials}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {profile?.full_name || profile?.email}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {role ? ROLE_LABEL[role] : "Sem papel definido"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void navigate({ to: "/configuracoes" })}>
                  <Settings className="mr-2 h-4 w-4" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-5 px-3 pb-28 pt-4 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Ação rápida mobile */}
      <Button
        size="icon"
        onClick={() => setNewLeadOpen(true)}
        aria-label="Novo lead"
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg lg:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Navegação mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        {NAV.filter((item) => MOBILE_NAV.includes(item.to)).map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              <span className="w-full truncate text-center">
                {item.to === "/intervencoes" ? "Intervenção" : item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </div>
  );
}
