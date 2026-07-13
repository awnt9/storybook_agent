import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { toast } from "sonner";
import { StoryBookPreview, DEFAULT_STORY_TITLE } from "../components/book";
import DraftExitDialog from "../components/DraftExitDialog";
import Navbar from "../components/Navbar";
import { apiRequest } from "../lib/api";
import {
  clearStoredDraftId,
  commitDraft,
  discardDraft,
  ensureDraftSession,
} from "../lib/draft";

export default function NewStory() {
  const [draftId, setDraftId] = useState(null);
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const [hasDraftProgress, setHasDraftProgress] = useState(false);
  const [isExitPending, setIsExitPending] = useState(false);
  const draftActivityRef = useRef({
    hasProgress: false,
    canSave: false,
    coverTitle: DEFAULT_STORY_TITLE,
  });

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname === "/nueva-historia" &&
      currentLocation.pathname !== nextLocation.pathname &&
      hasDraftProgress,
  );

  useEffect(() => {
    let isMounted = true;

    ensureDraftSession(apiRequest)
      .then((nextDraftId) => {
        if (!isMounted) return;
        setDraftId(nextDraftId);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error(error);
        toast.error("No se pudo iniciar el borrador");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsDraftLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDraftActivityChange = useCallback((activity) => {
    draftActivityRef.current = activity;
    setHasDraftProgress(activity.hasProgress);
  }, []);

  const finishNavigation = useCallback(() => {
    clearStoredDraftId();
    setHasDraftProgress(false);
    blocker.proceed?.();
  }, [blocker]);

  const handleStay = useCallback(() => {
    blocker.reset?.();
  }, [blocker]);

  const handleDiscard = useCallback(async () => {
    if (!draftId || isExitPending) return;

    setIsExitPending(true);
    try {
      await discardDraft(apiRequest, draftId);
      finishNavigation();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo descartar el borrador");
    } finally {
      setIsExitPending(false);
    }
  }, [draftId, finishNavigation, isExitPending]);

  const handleSave = useCallback(async () => {
    if (!draftId || isExitPending) return;

    if (!draftActivityRef.current.canSave) {
      toast.error("Continúa la historia al menos una vez antes de guardar");
      return;
    }

    setIsExitPending(true);
    try {
      const trimmedTitle = draftActivityRef.current.coverTitle?.trim();
      const title =
        trimmedTitle && trimmedTitle !== DEFAULT_STORY_TITLE
          ? trimmedTitle
          : undefined;

      await commitDraft(apiRequest, draftId, { title });
      clearStoredDraftId();
      toast.success("Historia guardada");
      finishNavigation();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo guardar la historia");
    } finally {
      setIsExitPending(false);
    }
  }, [draftId, finishNavigation, isExitPending]);

  return (
    <div className="game-page min-h-screen">
      <Navbar />

      <main className="mx-auto mt-8 max-w-6xl px-6 pb-8">
        {isDraftLoading ? (
          <p className="text-center font-black text-slate-700">Preparando tu borrador...</p>
        ) : (
          <StoryBookPreview
            draftId={draftId}
            onDraftActivityChange={handleDraftActivityChange}
          />
        )}
      </main>

      <DraftExitDialog
        isOpen={blocker.state === "blocked"}
        isPending={isExitPending}
        onCancel={handleStay}
        onDiscard={handleDiscard}
        onSave={handleSave}
      />
    </div>
  );
}
