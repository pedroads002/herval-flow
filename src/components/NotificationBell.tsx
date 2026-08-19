import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardList,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from "@/lib/api-notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function getNotificationIcon(type: string) {
  switch (type) {
    case "demand_assigned":
      return <ClipboardList className="h-4 w-4 text-primary" />;
    case "deletion_requested":
      return <Trash2 className="h-4 w-4 text-destructive" />;
    case "deletion_reviewed":
      return <AlertCircle className="h-4 w-4 text-warning" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Há ${days}d`;
  return formatDateTime(dateStr);
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, isPending } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read_at) {
      await markRead.mutateAsync(notif.id).catch(() => null);
    }
    setOpen(false);
    if (notif.demand_id || notif.type.includes("demand") || notif.type.includes("deletion")) {
      void navigate({ to: "/demandas" });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={unreadCount > 0 ? `${unreadCount} notificações não lidas` : "Notificações"}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-in zoom-in-50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] max-w-[calc(100vw-1.5rem)] p-0 shadow-lg border-border"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                {unreadCount} nova{unreadCount > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Marcar todas
            </Button>
          ) : null}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
          {isPending ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Carregando notificações...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Você receberá avisos sobre atribuições de demandas e pedidos operacionais aqui.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.read_at;
              return (
                <div
                  key={notif.id}
                  onClick={() => void handleNotificationClick(notif)}
                  className={cn(
                    "group relative flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-accent/50",
                    isUnread ? "bg-primary/5" : "bg-card",
                  )}
                >
                  <div className="mt-0.5 shrink-0 rounded-md border border-border bg-background p-1.5 shadow-xs">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={cn(
                          "truncate text-xs",
                          isUnread
                            ? "font-semibold text-foreground"
                            : "font-medium text-muted-foreground",
                        )}
                      >
                        {notif.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3 inline" /> {timeAgo(notif.created_at)}
                      </span>
                    </div>
                    {notif.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notif.body}
                      </p>
                    ) : null}
                  </div>

                  {isUnread ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-70 group-hover:opacity-100"
                      title="Marcar como lida"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead.mutate(notif.id);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
