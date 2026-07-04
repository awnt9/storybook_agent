import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "./ConfirmDialog";
import { apiRequest } from "../lib/api";

export default function ProfileModal({ isOpen, onClose }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [revealedKeys, setRevealedKeys] = useState({});
  const [label, setLabel] = useState("");
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [keyToDelete, setKeyToDelete] = useState(null);
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (!isOpen) return;
    const loadApiKeys = async () => {
      setIsLoading(true);
      try {
        setApiKeys(await apiRequest("/api/v1/users/me/api-keys"));
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadApiKeys();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (keyToDelete && pendingAction !== `delete-${keyToDelete.id}`) {
        setKeyToDelete(null);
        return;
      }
      if (!keyToDelete) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, keyToDelete, onClose, pendingAction]);

  if (!isOpen) return null;

  const createApiKey = async (event) => {
    event.preventDefault();
    setPendingAction("create");
    try {
      const created = await apiRequest("/api/v1/users/me/api-keys", {
        method: "POST",
        body: JSON.stringify({ label, provider, api_key: apiKey }),
      });
      setApiKeys((current) => [created, ...current]);
      setLabel("");
      setApiKey("");
      toast.success("API key guardada y cifrada");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPendingAction(null);
    }
  };

  const toggleReveal = async (id) => {
    if (revealedKeys[id]) {
      setRevealedKeys((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      return;
    }
    setPendingAction(`reveal-${id}`);
    try {
      const revealed = await apiRequest(`/api/v1/users/me/api-keys/${id}/reveal`);
      setRevealedKeys((current) => ({ ...current, [id]: revealed.api_key }));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPendingAction(null);
    }
  };

  const selectApiKey = async (id) => {
    setPendingAction(`select-${id}`);
    try {
      await apiRequest(`/api/v1/users/me/api-keys/${id}/select`, { method: "PUT" });
      setApiKeys((current) => current.map((key) => ({ ...key, is_selected: key.id === id })));
      toast.success("API key seleccionada");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPendingAction(null);
    }
  };

  const deleteApiKey = async (id) => {
    setPendingAction(`delete-${id}`);
    try {
      await apiRequest(`/api/v1/users/me/api-keys/${id}`, { method: "DELETE" });
      const remaining = apiKeys.filter((key) => key.id !== id);
      if (!remaining.some((key) => key.is_selected) && remaining.length > 0) {
        remaining[0] = { ...remaining[0], is_selected: true };
      }
      setApiKeys(remaining);
      setRevealedKeys((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setKeyToDelete(null);
      toast.success("API key eliminada");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPendingAction(null);
    }
  };

  const copyApiKey = async (value) => {
    await navigator.clipboard.writeText(value);
    toast.success("API key copiada");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[2rem] border-4 border-slate-900 bg-[#fff5cf] p-2 shadow-[12px_12px_0_#111827] md:p-3">
        <div className="max-h-[calc(92vh-2rem)] overflow-y-auto p-3 pr-4 md:p-4 md:pr-5">
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="profile-title" className="text-3xl font-black">Mis API keys</h2><p className="mt-1 font-semibold text-slate-600">{user?.email}</p></div>
          <button type="button" onClick={onClose} className="rounded-xl border-3 border-slate-900 bg-white p-2 shadow-[3px_3px_0_#111827]" aria-label="Cerrar perfil"><X className="h-5 w-5" /></button>
        </div>

        <section className="mt-6 rounded-3xl border-4 border-slate-900 bg-white p-5">
          <div className="flex items-center gap-2"><KeyRound className="h-6 w-6" /><h3 className="text-xl font-black">Nueva API key</h3></div>
          <p className="mt-2 text-sm font-semibold text-slate-600">Se guardan cifradas. La clave marcada como activa será la utilizada por el agente.</p>
          <form onSubmit={createApiKey} className="mt-5 grid gap-3 md:grid-cols-[1fr_150px]">
            <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Nombre, por ejemplo Personal" maxLength={100} required className="rounded-2xl border-3 border-slate-900 bg-cyan-50 px-4 py-3 font-bold outline-none" />
            <input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Proveedor" maxLength={50} required className="rounded-2xl border-3 border-slate-900 bg-yellow-50 px-4 py-3 font-bold outline-none" />
            <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="API key" minLength={8} maxLength={2048} autoComplete="off" required className="rounded-2xl border-3 border-slate-900 bg-pink-50 px-4 py-3 font-bold outline-none md:col-span-2" />
            <button type="submit" disabled={pendingAction === "create"} className="flex items-center justify-center gap-2 rounded-2xl border-3 border-slate-900 bg-lime-400 px-4 py-3 font-black shadow-[4px_4px_0_#111827] disabled:opacity-60 md:col-span-2">
              {pendingAction === "create" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />} Añadir API key
            </button>
          </form>
        </section>

        <section className="mt-5 space-y-3">
          {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin" /></div>}
          {!isLoading && apiKeys.length === 0 && <div className="rounded-3xl border-4 border-dashed border-slate-500 bg-white/60 p-6 text-center font-bold text-slate-600">Todavía no has guardado ninguna API key.</div>}
          {apiKeys.map((storedKey) => {
            const revealedValue = revealedKeys[storedKey.id];
            return (
              <article key={storedKey.id} className="rounded-3xl border-4 border-slate-900 bg-white p-4 shadow-[5px_5px_0_#111827]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-black">{storedKey.label}</h4><span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-black uppercase">{storedKey.provider}</span>{storedKey.is_selected && <span className="flex items-center gap-1 rounded-full bg-lime-300 px-2 py-1 text-xs font-black"><Check className="h-3.5 w-3.5" /> Activa</span>}</div>
                    <code className="mt-2 block break-all text-sm font-bold text-slate-600">{revealedValue || storedKey.masked_key}</code>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => toggleReveal(storedKey.id)} disabled={pendingAction === `reveal-${storedKey.id}`} className="rounded-xl border-2 border-slate-900 bg-cyan-200 p-2" aria-label={revealedValue ? "Ocultar API key" : "Mostrar API key"}>{revealedValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    {revealedValue && <button type="button" onClick={() => copyApiKey(revealedValue)} className="rounded-xl border-2 border-slate-900 bg-yellow-200 p-2" aria-label="Copiar API key"><Copy className="h-4 w-4" /></button>}
                    {!storedKey.is_selected && <button type="button" onClick={() => selectApiKey(storedKey.id)} disabled={pendingAction === `select-${storedKey.id}`} className="rounded-xl border-2 border-slate-900 bg-lime-300 px-3 py-2 text-sm font-black">Usar</button>}
                    <button type="button" onClick={() => setKeyToDelete(storedKey)} disabled={pendingAction === `delete-${storedKey.id}`} className="rounded-xl border-2 border-slate-900 bg-red-300 p-2" aria-label="Eliminar API key"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
        </div>
      </div>
      <ConfirmDialog
        isOpen={Boolean(keyToDelete)}
        title="¿Eliminar esta API key?"
        description={keyToDelete ? `Vas a borrar “${keyToDelete.label}”. Esta acción no se puede deshacer.` : ""}
        isPending={pendingAction === `delete-${keyToDelete?.id}`}
        onCancel={() => setKeyToDelete(null)}
        onConfirm={() => deleteApiKey(keyToDelete.id)}
      />
    </div>,
    document.body,
  );
}
