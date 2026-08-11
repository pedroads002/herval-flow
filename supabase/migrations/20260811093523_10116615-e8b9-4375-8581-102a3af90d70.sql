
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('gestor', 'crc');
CREATE TYPE public.lead_status AS ENUM ('novo','em_contato','follow_up','agendado','confirmado','compareceu','no_show','reagendamento','perdido','convertido');
CREATE TYPE public.appointment_status AS ENUM ('agendado','confirmado','compareceu','no_show','reagendado','cancelado');
CREATE TYPE public.followup_status AS ENUM ('pendente','concluido','cancelado');
CREATE TYPE public.intervention_reason AS ENUM ('ligacao','objecao','lead_quente','recuperacao','no_show_importante','outro');
CREATE TYPE public.intervention_status AS ENUM ('pendente','em_andamento','resolvida','cancelada');

-- UTIL
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'gestor');
$$;

CREATE POLICY "perfis visiveis para autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuario edita proprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_gestor()) WITH CHECK (id = auth.uid() OR public.is_gestor());
CREATE POLICY "usuario cria proprio perfil" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "papeis visiveis para autenticados" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- gestor manages roles
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
CREATE POLICY "gestor gerencia papeis" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_gestor());
CREATE POLICY "gestor remove papeis" ON public.user_roles FOR DELETE TO authenticated USING (public.is_gestor());

-- SIGNUP HANDLER: first user = gestor, others = crc
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_gestor BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'gestor') INTO has_gestor;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN has_gestor THEN 'crc'::public.app_role ELSE 'gestor'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLINICS
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  responsible_professional TEXT,
  specialty TEXT NOT NULL DEFAULT 'odontologia',
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  instagram TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX clinics_name_unique ON public.clinics (lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinicas visiveis para autenticados" ON public.clinics FOR SELECT TO authenticated USING (true);
CREATE POLICY "gestor cria clinicas" ON public.clinics FOR INSERT TO authenticated WITH CHECK (public.is_gestor());
CREATE POLICY "gestor edita clinicas" ON public.clinics FOR UPDATE TO authenticated USING (public.is_gestor()) WITH CHECK (public.is_gestor());
CREATE POLICY "gestor exclui clinicas" ON public.clinics FOR DELETE TO authenticated USING (public.is_gestor());
CREATE TRIGGER clinics_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LEADS
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  source TEXT,
  status public.lead_status NOT NULL DEFAULT 'novo',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  appointment_at TIMESTAMPTZ,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  attended BOOLEAN,
  loss_reason TEXT,
  notes TEXT,
  last_interaction_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  intervention_pending BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX leads_clinic_phone_unique ON public.leads (clinic_id, regexp_replace(coalesce(phone,''), '\D', '', 'g')) WHERE coalesce(phone,'') <> '';
CREATE UNIQUE INDEX leads_clinic_instagram_unique ON public.leads (clinic_id, lower(instagram)) WHERE coalesce(instagram,'') <> '';
CREATE INDEX leads_status_idx ON public.leads (status);
CREATE INDEX leads_clinic_idx ON public.leads (clinic_id);
CREATE INDEX leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX leads_next_follow_up_idx ON public.leads (next_follow_up_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads visiveis para autenticados" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado cria leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "autenticado edita leads" ON public.leads FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gestor exclui leads" ON public.leads FOR DELETE TO authenticated USING (public.is_gestor());
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'agendado',
  confirmed_at TIMESTAMPTZ,
  attended_at TIMESTAMPTZ,
  no_show_at TIMESTAMPTZ,
  rescheduled_from UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX appointments_unique_slot ON public.appointments (lead_id, clinic_id, scheduled_at);
CREATE UNIQUE INDEX appointments_one_active_per_lead ON public.appointments (lead_id) WHERE status IN ('agendado','confirmado');
CREATE INDEX appointments_scheduled_idx ON public.appointments (scheduled_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agenda visivel para autenticados" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado cria agendamentos" ON public.appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "autenticado edita agendamentos" ON public.appointments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gestor exclui agendamentos" ON public.appointments FOR DELETE TO authenticated USING (public.is_gestor());
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FOLLOW UPS
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status public.followup_status NOT NULL DEFAULT 'pendente',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX follow_ups_due_idx ON public.follow_ups (due_at);
CREATE INDEX follow_ups_status_idx ON public.follow_ups (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followups visiveis para autenticados" ON public.follow_ups FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado cria followups" ON public.follow_ups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "autenticado edita followups" ON public.follow_ups FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gestor exclui followups" ON public.follow_ups FOR DELETE TO authenticated USING (public.is_gestor());
CREATE TRIGGER follow_ups_updated_at BEFORE UPDATE ON public.follow_ups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INTERVENTIONS
CREATE TABLE public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE RESTRICT,
  reason public.intervention_reason NOT NULL DEFAULT 'outro',
  status public.intervention_status NOT NULL DEFAULT 'pendente',
  description TEXT,
  resolution_notes TEXT,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX interventions_one_open_per_lead ON public.interventions (lead_id) WHERE status IN ('pendente','em_andamento');
CREATE INDEX interventions_status_idx ON public.interventions (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interventions TO authenticated;
GRANT ALL ON public.interventions TO service_role;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intervencoes visiveis para autenticados" ON public.interventions FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado solicita intervencao" ON public.interventions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gestor resolve intervencao" ON public.interventions FOR UPDATE TO authenticated USING (public.is_gestor() OR requested_by = auth.uid()) WITH CHECK (public.is_gestor() OR requested_by = auth.uid());
CREATE POLICY "gestor exclui intervencao" ON public.interventions FOR DELETE TO authenticated USING (public.is_gestor());
CREATE TRIGGER interventions_updated_at BEFORE UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LEAD EVENTS
CREATE TABLE public.lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lead_events_lead_idx ON public.lead_events (lead_id, created_at DESC);
GRANT SELECT, INSERT ON public.lead_events TO authenticated;
GRANT ALL ON public.lead_events TO service_role;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eventos visiveis para autenticados" ON public.lead_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticado registra eventos" ON public.lead_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- AUTO TIMELINE ON LEAD CHANGES
CREATE OR REPLACE FUNCTION public.log_lead_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lead_events (lead_id, event_type, description, actor_id)
    VALUES (NEW.id, 'lead_created', 'Lead criado', auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_events (lead_id, event_type, description, actor_id, metadata)
    VALUES (NEW.id, 'status_changed', 'Status alterado', auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER leads_log_insert AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.log_lead_change();
CREATE TRIGGER leads_log_update AFTER UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.log_lead_change();

-- VALIDATE LEAD STATE CONSISTENCY
CREATE OR REPLACE FUNCTION public.validate_lead_state()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('agendado','confirmado','compareceu','no_show','reagendamento') AND NEW.appointment_at IS NULL THEN
    RAISE EXCEPTION 'Lead neste status precisa de uma data de agendamento.';
  END IF;
  IF NEW.status = 'compareceu' THEN NEW.attended := true; END IF;
  IF NEW.status = 'no_show' THEN NEW.attended := false; END IF;
  IF NEW.status = 'confirmado' THEN NEW.confirmed := true; END IF;
  IF NEW.status = 'perdido' AND coalesce(NEW.loss_reason,'') = '' THEN
    RAISE EXCEPTION 'Informe o motivo da perda.';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER leads_validate BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.validate_lead_state();
