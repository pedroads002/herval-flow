import type { ComponentType, ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="h-8 w-8 text-muted-foreground" /> : null}

      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted/60" />
      ))}
    </div>
  );
}

export function ErrorState({ message = "Não foi possível carregar os dados.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-6 text-center">
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function GestorOnly({ children }: { children: ReactNode }) {
  const { isGestor, loading } = useAuth();
  if (loading) return <LoadingState label="Verificando permissões..." />;
  if (!isGestor) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Área restrita ao gestor"
        description="Você não tem permissão para acessar esta área. Fale com o gestor comercial."
      />
    );
  }
  return <>{children}</>;
}
