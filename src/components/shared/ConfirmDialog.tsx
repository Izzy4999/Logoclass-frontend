import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

export default function ConfirmDialog({
  open, onClose, onConfirm, title = "Confirm", message,
  confirmLabel = "Confirm", variant = "danger", loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3 mb-5">
        <div className={`p-2 rounded-lg flex-shrink-0 ${variant === "danger" ? "bg-red-50" : "bg-yellow-50"}`}>
          <AlertTriangle className={`h-5 w-5 ${variant === "danger" ? "text-red-500" : "text-yellow-600"}`} />
        </div>
        <p className="text-sm text-muted-foreground pt-1">{message}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white disabled:opacity-50 ${
            variant === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-yellow-500 hover:bg-yellow-600"
          }`}
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
