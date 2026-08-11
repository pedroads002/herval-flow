import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarPlus,
  MessageCircle,
  Phone,
  RotateCcw,
  Siren,
  Instagram,
  History,
} from "lucide-react";
import { PageHeader, SectionCard, StatusBadge } from "@/components/Primitives";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import {
  useAppointmentAction,
  useLead,
  useLeadAppointments,
  useLeadEvents,
  useUpdateLead,
} from "@/lib/api";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  LEAD_EVENT_LABEL,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_TONE,
  LEAD_STATUS_TRANSITIONS,
} from "@/lib/domain";
import { formatDateTime, formatPhone, onlyDigits, relativeDay } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppointmentDialog, FollowUpDialog, InterventionDialog } from "@/components/OperationDialogs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({
    meta: [
      { title: "Detalhe do lead — Herval Flow" },
      { name: "description", content: "Histórico, agendamentos e ações comerciais do lead." },
    ],
  }),
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const leadQuery = useLead(leadId);
  const eventsQuery = useLeadEvents(leadId);
  const appointmentsQuery = useLeadAppointments(leadId);
  const updateLead = useUpdateLead();
  const appointmentAction = useAppointmentAction();

  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [rescheduleFrom, setRescheduleFrom] = useState<string | undefined>(undefined);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [interventionOpen, setInterventionOpen] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);

  if (leadQuery.isPending) return <LoadingState />;
  if (leadQuery.isError || !leadQuery.data)
    return <ErrorState message="Lead não encontrado." onRetry={() => void leadQuery.refetch()} />;

  const lead = leadQuery.data;
  const nextStatuses = LEAD_STATUS_TRANSITIONS[lead.status];
  const activeAppointment = (appointmentsQuery.data ?? []).find(
    (item) => item.status === "agendado" || item.status === "confirmado",
  );
  const whatsapp = onlyDigits(lead.whatsapp || lead.phone);

  return (
    <>
      <Link
        to="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para leads
      </Link>

      <PageHeader
        title={lead.name}
        description={`${lead.clinic?.name ?? "Sem clínica"} · criado ${relativeDay(lead.created_at)}`}
        actions={
          <>
            <StatusBadge label={LEAD_STATUS_LABEL[lead.status]} tone={LEAD_STATUS_TONE[lead.status]} />
            {lead.intervention_pending ? (
              <StatusBadge label="Intervenção pendente" tone="border-destructive/40 text-destructive" />
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            setRescheduleFrom(undefined);
            setAppointmentOpen(true);
          }}
        >
          <CalendarPlus className="mr-2 h-4 w-4" /> Agendar consulta
        </Button>
        <Button variant="outline" onClick={() => setFollowUpOpen(true)}>
          <RotateCcw className="mr-2 h-4 w-4" /> Follow-up
        </Button>
        <Button variant="outline" onClick={() => setInterventionOpen(true)}>
          <Siren className="mr-2 h-4 w-4" /> Solicitar intervenção
        </Button>
        {whatsapp ? (
          <Button asChild variant="outline">
            <a href={`https://wa.me/55${whatsapp}`} target="_blank" rel="noreferrer noopener">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
            </a>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <SectionCard title="Consultas" description="Agendamentos deste lead">
            {appointmentsQuery.isPending ? (
              <LoadingState />
            ) : (appointmentsQuery.data ?? []).length === 0 ? (
              <EmptyState
                icon={CalendarPlus}
                title="Nenhuma consulta agendada"
                description="Agende a primeira consulta para avançar o lead no funil."
              />
            ) : (
              <ul className="space-y-2">
                {(appointmentsQuery.data ?? []).map((appointment) => (
                  <li key={appointment.id} className="rounded-md border border-border p-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <p className="truncate text-sm font-medium">{formatDateTime(appointment.scheduled_at)}</p>
                      <StatusBadge
                        label={APPOINTMENT_STATUS_LABEL[appointment.status]}
                        tone={APPOINTMENT_STATUS_TONE[appointment.status]}
                      />
                    </div>
                    {appointment.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">{appointment.notes}</p>
                    ) : null}
                    {appointment.id === activeAppointment?.id ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {appointment.status === "agendado" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={appointmentAction.isPending}
                            onClick={() =>
                              appointmentAction.mutate({ appointment, action: "confirmar" })
                            }
                          >
                            Confirmar
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={appointmentAction.isPending}
                          onClick={() => appointmentAction.mutate({ appointment, action: "comparecimento" })}
                        >
                          Compareceu
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={appointmentAction.isPending}
                          onClick={() => appointmentAction.mutate({ appointment, action: "no_show" })}
                        >
                          No-show
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRescheduleFrom(appointment.id);
                            setAppointmentOpen(true);
                          }}
                        >
                          Reagendar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={appointmentAction.isPending}
                          onClick={() => appointmentAction.mutate({ appointment, action: "cancelar" })}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Linha do tempo" description="Todo o histórico registrado">
            {eventsQuery.isPending ? (
              <LoadingState />
            ) : eventsQuery.isError ? (
              <ErrorState onRetry={() => void eventsQuery.refetch()} />
            ) : eventsQuery.data.length === 0 ? (
              <EmptyState icon={History} title="Sem histórico" description="As ações aparecerão aqui." />
            ) : (
              <ol className="space-y-3 border-l border-border pl-4">
                {eventsQuery.data.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-sm font-medium">
                      {LEAD_EVENT_LABEL[event.event_type] ?? event.event_type}
                    </p>
                    {event.description ? (
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(event.created_at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Contato">
            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{formatPhone(lead.phone) || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{formatPhone(lead.whatsapp) || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{lead.instagram ? `@${lead.instagram}` : "Não informado"}</span>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                Origem: {lead.source ?? "Não informada"}
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Mover status" description="Transições permitidas pelo funil">
            {nextStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este lead está em um status final.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    disabled={updateLead.isPending}
                    onClick={() => {
                      updateLead.mutate(
                        { id: lead.id, status, last_interaction_at: new Date().toISOString() },
                        { onSuccess: () => toast.success(`Lead movido para ${LEAD_STATUS_LABEL[status]}.`) },
                      );
                    }}
                  >
                    {LEAD_STATUS_LABEL[status]}
                  </Button>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Observações">
            <Textarea
              value={notes ?? lead.notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Anote o contexto do atendimento..."
            />
            <Button
              size="sm"
              className="mt-3"
              disabled={updateLead.isPending || notes === null}
              onClick={() =>
                updateLead.mutate(
                  { id: lead.id, notes: notes?.trim() || null },
                  {
                    onSuccess: () => {
                      setNotes(null);
                      toast.success("Observações salvas.");
                    },
                  },
                )
              }
            >
              Salvar observações
            </Button>
          </SectionCard>
        </div>
      </div>

      <AppointmentDialog
        open={appointmentOpen}
        onOpenChange={setAppointmentOpen}
        lead={{ id: lead.id, clinic_id: lead.clinic_id, name: lead.name }}
        {...(rescheduleFrom ? { rescheduleFrom } : {})}
      />
      <FollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        lead={{ id: lead.id, clinic_id: lead.clinic_id, name: lead.name }}
      />
      <InterventionDialog
        open={interventionOpen}
        onOpenChange={setInterventionOpen}
        lead={{ id: lead.id, clinic_id: lead.clinic_id, name: lead.name }}
      />
    </>
  );
}
