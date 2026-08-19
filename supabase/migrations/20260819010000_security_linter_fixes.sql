-- =========================================================
-- SECURITY LINTER RESOLUTION: LEAST-PRIVILEGE FUNCTION PERMISSIONS
-- =========================================================

-- 1. Helper & Access Functions: Grant only to authenticated users, revoke from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.can_view_demand(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_demand(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_gestor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_gestor() TO authenticated;

-- 2. Trigger & Internal Functions: Revoke from PUBLIC, anon AND authenticated
-- (These should only be executed by Postgres triggers, not directly called via RPC/API)
REVOKE EXECUTE ON FUNCTION public.guard_demand_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_activation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_demand_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_deletion_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_lead_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_lead_state() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_demand_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_demand_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_demand_completion() FROM PUBLIC, anon, authenticated;

-- 3. Ensure search_path is set securely on all functions
ALTER FUNCTION public.is_active_user() SET search_path = public;
ALTER FUNCTION public.can_view_demand(uuid) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION public.is_gestor() SET search_path = public;
ALTER FUNCTION public.guard_demand_assignment() SET search_path = public;
ALTER FUNCTION public.guard_profile_activation() SET search_path = public;
ALTER FUNCTION public.notify_demand_assignment() SET search_path = public;
ALTER FUNCTION public.handle_deletion_request() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.log_lead_change() SET search_path = public;
ALTER FUNCTION public.validate_lead_state() SET search_path = public;
ALTER FUNCTION public.log_demand_change() SET search_path = public;
ALTER FUNCTION public.log_demand_comment() SET search_path = public;
ALTER FUNCTION public.set_demand_completion() SET search_path = public;

-- 4. Ensure RLS policies on deletion_requests allow gestor to approve/reject/delete and user to view own
DROP POLICY IF EXISTS "gestor remove pedidos avaliados" ON public.deletion_requests;
CREATE POLICY "gestor remove pedidos avaliados" ON public.deletion_requests FOR DELETE TO authenticated
  USING (public.is_gestor() AND public.is_active_user());
