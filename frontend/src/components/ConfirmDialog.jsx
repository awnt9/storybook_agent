import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, LogOut, Trash2, X } from "lucide-react";

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Eliminar",
  confirmIcon: ConfirmIcon = Trash2,
  confirmTone = "danger",
  isPending = false,
  onCancel,
  onConfirm,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) cancelButtonRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const iconWrapClass =
    confirmTone === "exit"
      ? "bg-orange-300"
      : "bg-red-300";
  const confirmButtonClass =
    confirmTone === "exit"
      ? "bg-orange-300"
      : "bg-red-400";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-[2rem] border-4 border-slate-900 bg-[#fff5cf] p-5 shadow-[10px_10px_0_#111827] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-3 border-slate-900 ${iconWrapClass}`}>
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border-2 border-slate-900 bg-white p-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar confirmación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 id="confirm-dialog-title" className="mt-5 text-2xl font-black">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-2 font-semibold text-slate-600">
          {description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-2xl border-3 border-slate-900 bg-white px-4 py-3 font-black shadow-[3px_3px_0_#111827] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`flex items-center justify-center gap-2 rounded-2xl border-3 border-slate-900 px-4 py-3 font-black shadow-[3px_3px_0_#111827] disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonClass}`}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ConfirmIcon className="h-5 w-5" />
            )}
            {isPending
              ? confirmTone === "exit"
                ? "Saliendo..."
                : "Eliminando..."
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
