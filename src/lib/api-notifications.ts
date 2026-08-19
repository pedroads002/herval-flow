import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { friendlyError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export type Notification = Database["public"]["Tables"]["notifications"]["Row"] & {
  demand?: { id: string; title: string; status: string } | null;
};

function assertOk<T>(result: { data: T; error: unknown }) {
  if (result.error) throw result.error;
  return result.data;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const result = await supabase
        .from("notifications")
        .select("*, demand:demands(id, title, status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);
      return assertOk(result) as Notification[];
    },
    enabled: Boolean(user?.id),
    staleTime: 1000 * 15,
  });

  // Supabase Realtime subscription for instant updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return {
    ...query,
    notifications,
    unreadCount,
  };
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const now = new Date().toISOString();
      const result = await supabase
        .from("notifications")
        .update({ read_at: now, viewed_at: now })
        .eq("id", notificationId)
        .select()
        .single();
      return assertOk(result) as Notification;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível marcar como lida.")),
  });
}

export function useMarkNotificationViewed() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const now = new Date().toISOString();
      const result = await supabase
        .from("notifications")
        .update({ viewed_at: now })
        .eq("id", notificationId)
        .select()
        .single();
      return assertOk(result) as Notification;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: now, viewed_at: now })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
      toast.success("Todas as notificações foram marcadas como lidas.");
    },
    onError: (error) =>
      toast.error(friendlyError(error, "Não foi possível marcar todas como lidas.")),
  });
}
