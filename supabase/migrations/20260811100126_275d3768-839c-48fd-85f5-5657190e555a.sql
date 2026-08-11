-- ENUMS
CREATE TYPE public.demand_priority AS ENUM ('urgente','alta','media','baixa');
CREATE TYPE public.demand_status AS ENUM ('a_fazer','em_andamento','concluida','bloqueada');

-- PROFILES: avatar
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- TAGS
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'default',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tags_name_unique ON public.tags (lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags visiveis para autenticados" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestor cria tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (public.is_gestor());
CREATE POLICY "gestor edita tags" ON public.tags FOR UPDATE TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());
CREATE POLICY "gestor exclui tags" ON public.tags FOR DELETE TO authenticated USING (public.is_gestor());
CREATE TRIGGER tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DEMANDS
CREATE TABLE public.demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES auth.users(id),
  clinic_id uuid REFERENCES public.clinics(id),
  lead_id uuid REFERENCES public.leads(id),
  priority public.demand_priority NOT NULL DEFAULT 'media',
  status public.demand_status NOT NULL DEFAULT 'a_fazer',
  start_date date,
  due_at timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  archived_at timestamptz,
  archived_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demands_assigned_idx ON public.demands (assigned_to);
CREATE INDEX demands_status_idx ON public.demands (status);
CREATE INDEX demands_due_idx ON public.demands (due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demands TO authenticated;
GRANT ALL ON public.demands TO service_role;
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demandas visiveis para autenticados" ON public.demands FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado cria demandas" ON public.demands FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "autenticado edita demandas" ON public.demands FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gestor exclui demandas" ON public.demands FOR DELETE TO authenticated USING (public.is_gestor());
CREATE TRIGGER demands_updated_at BEFORE UPDATE ON public.demands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DEMAND TAGS
CREATE TABLE public.demand_tags (
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (demand_id, tag_id)
);
GRANT SELECT, INSERT, DELETE ON public.demand_tags TO authenticated;
GRANT ALL ON public.demand_tags TO service_role;
ALTER TABLE public.demand_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags da demanda visiveis" ON public.demand_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado vincula tags" ON public.demand_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "autenticado desvincula tags" ON public.demand_tags FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- COMMENTS
CREATE TABLE public.demand_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demand_comments_demand_idx ON public.demand_comments (demand_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demand_comments TO authenticated;
GRANT ALL ON public.demand_comments TO service_role;
ALTER TABLE public.demand_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comentarios visiveis para autenticados" ON public.demand_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado comenta" ON public.demand_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "autor edita comentario" ON public.demand_comments FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "autor ou gestor exclui comentario" ON public.demand_comments FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_gestor());
CREATE TRIGGER demand_comments_updated_at BEFORE UPDATE ON public.demand_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUDIT
CREATE TABLE public.demand_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demand_events_demand_idx ON public.demand_events (demand_id, created_at DESC);
GRANT SELECT, INSERT ON public.demand_events TO authenticated;
GRANT ALL ON public.demand_events TO service_role;
ALTER TABLE public.demand_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historico visivel para autenticados" ON public.demand_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado registra historico" ON public.demand_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- AUDIT TRIGGERS
CREATE OR REPLACE FUNCTION public.log_demand_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.demand_events (demand_id, event_type, description, actor_id)
    VALUES (NEW.id, 'demand_created', 'Demanda criada', auth.uid());
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.demand_events (demand_id, event_type, description, actor_id, metadata)
    VALUES (NEW.id, CASE WHEN NEW.status = 'concluida' THEN 'demand_completed' ELSE 'status_changed' END,
      'Status alterado', auth.uid(), jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.demand_events (demand_id, event_type, description, actor_id, metadata)
    VALUES (NEW.id, 'priority_changed', 'Prioridade alterada', auth.uid(),
      jsonb_build_object('from', OLD.priority, 'to', NEW.priority));
  END IF;
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.demand_events (demand_id, event_type, description, actor_id, metadata)
    VALUES (NEW.id, 'assignee_changed', 'Responsável alterado', auth.uid(),
      jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
  END IF;
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    INSERT INTO public.demand_events (demand_id, event_type, description, actor_id)
    VALUES (NEW.id, CASE WHEN NEW.archived_at IS NULL THEN 'demand_restored' ELSE 'demand_archived' END,
      CASE WHEN NEW.archived_at IS NULL THEN 'Demanda restaurada' ELSE 'Demanda arquivada' END, auth.uid());
  END IF;
  IF (NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id
      OR NEW.due_at IS DISTINCT FROM OLD.due_at
      OR NEW.start_date IS DISTINCT FROM OLD.start_date) THEN
    INSERT INTO public.demand_events (demand_id, event_type, description, actor_id)
    VALUES (NEW.id, 'demand_updated', 'Demanda editada', auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER demands_log_insert AFTER INSERT ON public.demands FOR EACH ROW EXECUTE FUNCTION public.log_demand_change();
CREATE TRIGGER demands_log_update AFTER UPDATE ON public.demands FOR EACH ROW EXECUTE FUNCTION public.log_demand_change();

CREATE OR REPLACE FUNCTION public.set_demand_completion()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'concluida' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'concluida') THEN
    NEW.completed_at := now();
    NEW.completed_by := auth.uid();
  ELSIF NEW.status <> 'concluida' THEN
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER demands_completion BEFORE INSERT OR UPDATE ON public.demands FOR EACH ROW EXECUTE FUNCTION public.set_demand_completion();

CREATE OR REPLACE FUNCTION public.log_demand_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.demand_events (demand_id, event_type, description, actor_id)
  VALUES (NEW.demand_id, 'comment_added', 'Comentário adicionado', auth.uid());
  RETURN NEW;
END; $$;
CREATE TRIGGER demand_comments_log AFTER INSERT ON public.demand_comments FOR EACH ROW EXECUTE FUNCTION public.log_demand_comment();

REVOKE EXECUTE ON FUNCTION public.log_demand_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_demand_comment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_demand_completion() FROM anon, authenticated;

-- TAGS INICIAIS
INSERT INTO public.tags (name) VALUES
  ('URGENTE'),('COMERCIAL'),('FOLLOW-UP'),('CONFIRMAÇÃO'),('LEADS'),('CLÍNICA'),('ADMINISTRATIVO'),('TREINAMENTO');
