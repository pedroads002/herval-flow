import { Trash2, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/lib/api";
import {
  useDeletionRequests,
  useReviewDeletionRequest,
  type DeletionRequestWithRelations,
} from "@/lib/api-demands";
import { formatDateTime } from "@/lib/format";

export function DemandDeletionRequestsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: requests = [], isPending } = useDeletionRequests({ status: "pendente" });
  const { data: team = [] } = useTeam();
  const review = useReviewDeletionRequest();

  const nameOf = (userId?: string | null) =>
    (userId
      ? team.find((m) => m.id === userId)?.full_name || team.find((m) => m.id === userId)?.email
      : null) || "Usuário";

  const handleReview = async (
    req: DeletionRequestWithRelations,
    decision: "aprovada" | "rejeitada",
  ) => {
    await review
      .mutateAsync({
        requestId: req.id,
        demandId: req.demand_id,
        decision,
      })
      .catch(() => null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <DialogTitle>Solicitações de exclusão</DialogTitle>
          </div>
          <DialogDescription>
            Avalie os pedidos de exclusão de demandas enviados pela equipe de CRCs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isPending ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Carregando solicitações...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhuma solicitação pendente</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quando uma CRC solicitar exclusão de demanda, ela aparecerá aqui para sua aprovação.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className="rounded-lg border border-border bg-card p-4 shadow-panel space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {req.entity_label || req.demand?.title || "Demanda"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado por:{" "}
                        <span className="font-medium text-foreground">
                          {nameOf(req.requested_by)}
                        </span>
                        {req.demand?.clinic ? ` · Clínica: ${req.demand.clinic.name}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDateTime(req.created_at)}
                    </span>
                  </div>

                  {req.reason ? (
                    <div className="rounded-md border border-border/60 bg-muted/40 p-2.5 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Motivo informado:</span>{" "}
                      {req.reason}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => void handleReview(req, "rejeitada")}
                      disabled={review.isPending}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      Recusar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs"
                      onClick={() => void handleReview(req, "aprovada")}
                      disabled={review.isPending}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Aprovar exclusão
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
