-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.can_view_demand(_demand_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_user() AND EXISTS (
    SELECT 1 FROM public.demands d
    WHERE d.id = _demand_id
      AND (public.is_gestor() OR d.assigned_to = auth.uid() OR d.created_by = auth.uid())
  );
$$;

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  event_type text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestor le auditoria" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_gestor() AND public.is_active_user());
CREATE POLICY "autenticado registra auditoria" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  demand_id uuid REFERENCES public.demands(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'demand_assigned',
  title text NOT NULL,
  body text,
  created_by uuid REFERENCES auth.users(id),
  read_at timestamptz,
  viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario le suas notificacoes" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user());
CREATE POLICY "usuario atualiza suas notificacoes" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_active_user())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sistema cria notificacoes" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user());

-- ============ DELETION REQUESTS ============
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL DEFAULT 'demand',
  entity_id uuid NOT NULL,
  demand_id uuid REFERENCES public.demands(id) ON DELETE CASCADE,
  entity_label text,
  reason text,
  status text NOT NULL DEFAULT 'pendente',
  requested_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.deletion_requests TO authenticated;
GRANT ALL ON public.deletion_requests TO service_role;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestor ou solicitante le pedidos" ON public.deletion_requests FOR SELECT TO authenticated
  USING (public.is_active_user() AND (public.is_gestor() OR requested_by = auth.uid()));
CREATE POLICY "autenticado pede exclusao" ON public.deletion_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND requested_by = auth.uid());
CREATE POLICY "gestor avalia pedidos" ON public.deletion_requests FOR UPDATE TO authenticated
  USING (public.is_gestor() AND public.is_active_user())
  WITH CHECK (public.is_gestor());
CREATE TRIGGER deletion_requests_updated_at BEFORE UPDATE ON public.deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DEMANDS: VISIBILIDADE POR ESCOPO ============
DROP POLICY IF EXISTS "demandas visiveis para autenticados" ON public.demands;
DROP POLICY IF EXISTS "autenticado cria demandas" ON public.demands;
DROP POLICY IF EXISTS "autenticado edita demandas" ON public.demands;
DROP POLICY IF EXISTS "gestor exclui demandas" ON public.demands;

CREATE POLICY "demandas do escopo do usuario" ON public.demands FOR SELECT TO authenticated
  USING (public.is_active_user() AND (public.is_gestor() OR assigned_to = auth.uid() OR created_by = auth.uid()));
CREATE POLICY "criar demandas no proprio escopo" ON public.demands FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_user() AND created_by = auth.uid()
    AND (public.is_gestor() OR assigned_to IS NULL OR assigned_to = auth.uid())
  );
CREATE POLICY "editar demandas do escopo" ON public.demands FOR UPDATE TO authenticated
  USING (public.is_active_user() AND (public.is_gestor() OR assigned_to = auth.uid() OR created_by = auth.uid()))
  WITH CHECK (public.is_active_user() AND (public.is_gestor() OR assigned_to = auth.uid() OR created_by = auth.uid()));
CREATE POLICY "gestor exclui demandas" ON public.demands FOR DELETE TO authenticated
  USING (public.is_gestor() AND public.is_active_user());

-- somente gestor pode trocar o responsável
CREATE OR REPLACE FUNCTION public.guard_demand_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NOT public.is_gestor() THEN
    RAISE EXCEPTION 'Apenas o gestor pode alterar o responsável pela demanda.';
  END IF;
  NEW.created_by := OLD.created_by;
  RETURN NEW;
END $$;
CREATE TRIGGER demands_guard_assignment BEFORE UPDATE ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.guard_demand_assignment();

-- ============ COMENTÁRIOS / EVENTOS / ETIQUETAS: MESMO ESCOPO ============
DROP POLICY IF EXISTS "comentarios visiveis para autenticados" ON public.demand_comments;
CREATE POLICY "comentarios do escopo" ON public.demand_comments FOR SELECT TO authenticated
  USING (public.can_view_demand(demand_id));
DROP POLICY IF EXISTS "autenticado comenta" ON public.demand_comments;
CREATE POLICY "comentar no escopo" ON public.demand_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_view_demand(demand_id));

DROP POLICY IF EXISTS "historico visivel para autenticados" ON public.demand_events;
CREATE POLICY "historico do escopo" ON public.demand_events FOR SELECT TO authenticated
  USING (public.can_view_demand(demand_id));

DROP POLICY IF EXISTS "tags da demanda visiveis" ON public.demand_tags;
CREATE POLICY "tags da demanda no escopo" ON public.demand_tags FOR SELECT TO authenticated
  USING (public.can_view_demand(demand_id));
DROP POLICY IF EXISTS "autenticado vincula tags" ON public.demand_tags;
CREATE POLICY "vincular tags no escopo" ON public.demand_tags FOR INSERT TO authenticated
  WITH CHECK (public.can_view_demand(demand_id));
DROP POLICY IF EXISTS "autenticado desvincula tags" ON public.demand_tags;
CREATE POLICY "desvincular tags no escopo" ON public.demand_tags FOR DELETE TO authenticated
  USING (public.can_view_demand(demand_id));

-- ============ USUÁRIO DESATIVADO PERDE ACESSO ============
DROP POLICY IF EXISTS "leads visiveis para autenticados" ON public.leads;
CREATE POLICY "leads visiveis para ativos" ON public.leads FOR SELECT TO authenticated USING (public.is_active_user());
DROP POLICY IF EXISTS "autenticado cria leads" ON public.leads;
CREATE POLICY "ativo cria leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
DROP POLICY IF EXISTS "autenticado edita leads" ON public.leads;
CREATE POLICY "ativo edita leads" ON public.leads FOR UPDATE TO authenticated
  USING (public.is_active_user()) WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "agenda visivel para autenticados" ON public.appointments;
CREATE POLICY "agenda visivel para ativos" ON public.appointments FOR SELECT TO authenticated USING (public.is_active_user());
DROP POLICY IF EXISTS "autenticado cria agendamentos" ON public.appointments;
CREATE POLICY "ativo cria agendamentos" ON public.appointments FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
DROP POLICY IF EXISTS "autenticado edita agendamentos" ON public.appointments;
CREATE POLICY "ativo edita agendamentos" ON public.appointments FOR UPDATE TO authenticated
  USING (public.is_active_user()) WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "followups visiveis para autenticados" ON public.follow_ups;
CREATE POLICY "followups visiveis para ativos" ON public.follow_ups FOR SELECT TO authenticated USING (public.is_active_user());
DROP POLICY IF EXISTS "autenticado cria followups" ON public.follow_ups;
CREATE POLICY "ativo cria followups" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
DROP POLICY IF EXISTS "autenticado edita followups" ON public.follow_ups;
CREATE POLICY "ativo edita followups" ON public.follow_ups FOR UPDATE TO authenticated
  USING (public.is_active_user()) WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "intervencoes visiveis para autenticados" ON public.interventions;
CREATE POLICY "intervencoes visiveis para ativos" ON public.interventions FOR SELECT TO authenticated USING (public.is_active_user());
DROP POLICY IF EXISTS "autenticado solicita intervencao" ON public.interventions;
CREATE POLICY "ativo solicita intervencao" ON public.interventions FOR INSERT TO authenticated WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "clinicas visiveis para autenticados" ON public.clinics;
CREATE POLICY "clinicas visiveis para ativos" ON public.clinics FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS "eventos visiveis para autenticados" ON public.lead_events;
CREATE POLICY "eventos visiveis para ativos" ON public.lead_events FOR SELECT TO authenticated USING (public.is_active_user());
DROP POLICY IF EXISTS "autenticado registra eventos" ON public.lead_events;
CREATE POLICY "ativo registra eventos" ON public.lead_events FOR INSERT TO authenticated WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "tags visiveis para autenticados" ON public.tags;
CREATE POLICY "tags visiveis para ativos" ON public.tags FOR SELECT TO authenticated USING (public.is_active_user());

-- ============ PERFIS: SOMENTE GESTOR ATIVA/DESATIVA ============
CREATE OR REPLACE FUNCTION public.guard_profile_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active AND NOT public.is_gestor() THEN
    RAISE EXCEPTION 'Apenas o gestor pode ativar ou desativar usuários.';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    INSERT INTO public.audit_log (entity_type, entity_id, event_type, description, actor_id)
    VALUES ('user', NEW.id,
      CASE WHEN NEW.is_active THEN 'user_activated' ELSE 'user_deactivated' END,
      CASE WHEN NEW.is_active THEN 'Usuário ativado' ELSE 'Usuário desativado' END,
      auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_guard_activation BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_activation();

-- ============ NOTIFICAÇÃO DE ATRIBUIÇÃO ============
CREATE OR REPLACE FUNCTION public.notify_demand_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF NEW.assigned_to IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)
     AND NEW.assigned_to IS DISTINCT FROM v_actor THEN
    INSERT INTO public.notifications (user_id, demand_id, type, title, body, created_by)
    VALUES (NEW.assigned_to, NEW.id, 'demand_assigned', 'Nova demanda atribuída a você.', NEW.title, v_actor);
    INSERT INTO public.audit_log (entity_type, entity_id, event_type, description, actor_id)
    VALUES ('demand', NEW.id, 'notification_created', 'Notificação de atribuição enviada', v_actor);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER demands_notify_insert AFTER INSERT ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.notify_demand_assignment();
CREATE TRIGGER demands_notify_update AFTER UPDATE ON public.demands
  FOR EACH ROW EXECUTE FUNCTION public.notify_demand_assignment();

-- ============ PEDIDOS DE EXCLUSÃO: NOTIFICA GESTOR + AUDITORIA ============
CREATE OR REPLACE FUNCTION public.handle_deletion_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gestor_row record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, event_type, description, actor_id)
    VALUES (NEW.entity_type, NEW.entity_id, 'deletion_requested', COALESCE(NEW.entity_label, 'Exclusão solicitada'), NEW.requested_by);
    IF NEW.demand_id IS NOT NULL THEN
      INSERT INTO public.demand_events (demand_id, event_type, description, actor_id)
      VALUES (NEW.demand_id, 'deletion_requested', 'Exclusão solicitada', NEW.requested_by);
    END IF;
    FOR gestor_row IN SELECT user_id FROM public.user_roles WHERE role = 'gestor' LOOP
      INSERT INTO public.notifications (user_id, demand_id, type, title, body, created_by)
      VALUES (gestor_row.user_id, NEW.demand_id, 'deletion_requested', 'Nova solicitação de exclusão.',
              COALESCE(NEW.entity_label, 'Registro operacional'), NEW.requested_by);
    END LOOP;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.audit_log (entity_type, entity_id, event_type, description, actor_id)
    VALUES (NEW.entity_type, NEW.entity_id,
      CASE WHEN NEW.status = 'aprovada' THEN 'deletion_approved' ELSE 'deletion_rejected' END,
      COALESCE(NEW.entity_label, 'Solicitação avaliada'), auth.uid());
    IF NEW.requested_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, demand_id, type, title, body, created_by)
      VALUES (NEW.requested_by, NEW.demand_id, 'deletion_reviewed',
        CASE WHEN NEW.status = 'aprovada' THEN 'Exclusão aprovada pelo gestor.' ELSE 'Exclusão recusada pelo gestor.' END,
        COALESCE(NEW.entity_label, 'Registro operacional'), auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER deletion_requests_insert AFTER INSERT ON public.deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_deletion_request();
CREATE TRIGGER deletion_requests_update AFTER UPDATE ON public.deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_deletion_request();