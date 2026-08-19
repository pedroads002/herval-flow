import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeleteDemand,
  useRequestDemandDeletion,
  type DemandWithRelations,
} from "@/lib/api-demands";

export function DemandDeleteDialog({
  demand,
  open,
  onOpenChange,
  onSuccess,
}: {
  demand: DemandWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { isGestor } = useAuth();
  const [reason, setReason] = useState("");
  const deleteDemand = useDeleteDemand();
  const requestDeletion = useRequestDemandDeletion();

  const isPending = deleteDemand.isPending || requestDeletion.isPending;

  const handleConfirm = async () => {
    if (!demand) return;

    if (isGestor) {
      // Gestor/ADM pode excluir diretamente
      const result = await deleteDemand.mutateAsync(demand.id).catch(() => null);
      if (result) {
        setReason("");
        onOpenChange(false);
        onSuccess?.();
      }
    } else {
      // CRC solicita exclusão ao Gestor
      const result = await requestDeletion
        .mutateAsync({
          demandId: demand.id,
          demandTitle: demand.title,
          reason,
        })
        .catch(() => null);
      if (result) {
        setReason("");
        onOpenChange(false);
        onSuccess?.();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>
            {isGestor ? "Excluir demanda" : "Solicitar exclusão de demanda"}
          </DialogTitle>
          <DialogDescription>
            {isGestor ? (
              <>
                Tem certeza que deseja excluir a demanda{" "}
                <span className="font-semibold text-foreground">"{demand?.title}"</span>? Esta ação
                é irreversível.
              </>
            ) : (
              <>
                Como CRC, a exclusão de demandas requer a aprovação do ADM. A demanda{" "}
                <span className="font-semibold text-foreground">"{demand?.title}"</span> permanecerá
                ativa até que o gestor aprove sua solicitação.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isGestor ? (
          <div className="space-y-2 py-2">
            <Label htmlFor="deletion-reason">Motivo da solicitação (opcional)</Label>
            <Textarea
              id="deletion-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo pelo qual esta demanda deve ser excluída..."
              rows={3}
              maxLength={500}
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} disabled={isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            {isPending
              ? isGestor
                ? "Excluindo..."
                : "Solicitando..."
              : isGestor
                ? "Excluir definitivamente"
                : "Solicitar exclusão ao ADM"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
