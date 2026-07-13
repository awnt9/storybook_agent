import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, Save, Trash2, X } from "lucide-react";

export default function DraftExitDialog({
  isOpen,
  isPending = false,
  onCancel,
  onDiscard,
  onSave,
}) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) cancelButtonRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="draft-exit-dialog-title"
      aria-describedby="draft-exit-dialog-description"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-[2rem] border-4 border-slate-900 bg-[#fff5cf] p-5 shadow-[10px_10px_0_#111827] md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-3 border-slate-900 bg-cyan-300">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border-2 border-slate-900 bg-white p-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar diálogo"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 id="draft-exit-dialog-title" className="mt-5 text-2xl font-black">
          ¿Qué hacemos con tu historia?
        </h2>
        <p id="draft-exit-dialog-description" className="mt-2 font-semibold text-slate-600">
          Puedes guardarla en Mis historias o salir y perder este borrador.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-2xl border-3 border-slate-900 bg-pink-400 px-4 py-3 font-black shadow-[3px_3px_0_#111827] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {isPending ? "Guardando..." : "Guardar y salir"}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-2xl border-3 border-slate-900 bg-white px-4 py-3 font-black shadow-[3px_3px_0_#111827] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={onDiscard}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-2xl border-3 border-slate-900 bg-orange-300 px-4 py-3 font-black shadow-[3px_3px_0_#111827] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
              {isPending ? "Saliendo..." : "Descartar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
