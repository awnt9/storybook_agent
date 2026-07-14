import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { apiRequest } from "../../lib/api";
import { loadDraft, updateDraftInteraction, updateDraftSetup } from "../../lib/draft";
import backCoverImage from "../../assets/book/back_cover.png";
import coverImage from "../../assets/book/cover.png";
import leftPageImage from "../../assets/book/left_page.png";
import rightPageImage from "../../assets/book/right_page.png";
import {
  InteractionLayer,
  buildUserActionFromResponse,
  isInteractionComplete,
} from "./interaction/InteractionLayer";
import "./style.css";

const DEFAULT_STORY_TITLE = "Título del cuento";

export { DEFAULT_STORY_TITLE };

function hasCustomCoverTitle(title) {
  const trimmed = title.trim();
  return trimmed !== "" && trimmed !== DEFAULT_STORY_TITLE;
}

function isCoverSetupComplete(coverPhotoFile, coverPhotoUrl, coverTitle, hasPersistedCover = false) {
  return (
    (Boolean(coverPhotoFile) || Boolean(coverPhotoUrl) || hasPersistedCover) &&
    hasCustomCoverTitle(coverTitle)
  );
}

function extractCoverImageUrl(storyState) {
  const scene = storyState?.current_scene;
  if (!scene?.images) return null;

  const images = Array.isArray(scene.images) ? scene.images : [scene.images];
  return images.filter(Boolean)[0]?.url ?? null;
}

function CoverPhotoInput({ photoFile, photoUrl, onPhotoChange }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    let isMounted = true;
    let localPreviewUrl = null;

    if (photoFile) {
      localPreviewUrl = URL.createObjectURL(photoFile);
      setPreviewUrl(localPreviewUrl);
      return () => {
        URL.revokeObjectURL(localPreviewUrl);
      };
    }

    if (!photoUrl) {
      setPreviewUrl(null);
      return undefined;
    }

    if (photoUrl.startsWith("blob:")) {
      setPreviewUrl(photoUrl);
      return undefined;
    }

    resolveAuthenticatedImageUrl(photoUrl)
      .then((nextPreviewUrl) => {
        if (!isMounted) {
          URL.revokeObjectURL(nextPreviewUrl);
          return;
        }
        localPreviewUrl = nextPreviewUrl;
        setPreviewUrl(nextPreviewUrl);
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) setPreviewUrl(null);
      });

    return () => {
      isMounted = false;
      if (localPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [photoFile, photoUrl]);

  const loadPhoto = (photo) => {
    if (!photo?.type.startsWith("image/")) return;
    onPhotoChange(photo);
  };

  const selectPhoto = (event) => {
    loadPhoto(event.target.files[0]);
    event.target.value = "";
  };

  const startDragging = (event) => {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const continueDragging = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const stopDragging = (event) => {
    event.preventDefault();
    dragDepth.current = Math.max(dragDepth.current - 1, 0);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const dropPhoto = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    loadPhoto(event.dataTransfer.files[0]);
  };

  return (
    <label
      className={`cover-photo-input${isDragging ? " cover-photo-input-dragging" : ""}`}
      onDragEnter={startDragging}
      onDragLeave={stopDragging}
      onDragOver={continueDragging}
      onDrop={dropPhoto}
    >
      <input
        accept="image/*"
        aria-label="Seleccionar foto para la portada"
        onChange={selectPhoto}
        type="file"
      />
      {previewUrl ? (
        <img alt="Foto seleccionada para la portada" src={previewUrl} />
      ) : (
        <span className="cover-photo-placeholder">
          <ImagePlus aria-hidden="true" />
          <strong>Portada del libro</strong>
          <small>Haz clic o arrástrala aquí</small>
          <small>PNG, JPG o WEBP</small>
        </span>
      )}
    </label>
  );
}

function BookCover() {
  return (
    <div className="book-cover">
      <img alt="Portada del cuento" src={coverImage} />
    </div>
  );
}

function BookCoverEditor({
  coverPhotoFile,
  coverPhotoUrl,
  coverTitle,
  isVisible,
  isPreviewing,
  onCoverPhotoChange,
  onCoverTitleChange,
}) {
  return (
    <div
      aria-hidden={!isVisible}
      className={[
        "book-cover-editor",
        isVisible ? "" : "book-cover-editor-hidden",
        isPreviewing ? "book-cover-editor-preview" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <CoverPhotoInput
        onPhotoChange={onCoverPhotoChange}
        photoFile={coverPhotoFile}
        photoUrl={coverPhotoUrl}
      />
      <textarea
        aria-label="Título del cuento"
        className="cover-text-input cover-story-title-input"
        maxLength={35}
        onChange={(event) => onCoverTitleChange(event.target.value)}
        onClick={(event) => event.currentTarget.select()}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        rows={2}
        spellCheck="false"
        tabIndex={isVisible ? 0 : -1}
        value={coverTitle}
      />
    </div>
  );
}

function BookBackCover() {
  return (
    <div className="book-cover">
      <img alt="Contraportada del cuento" src={backCoverImage} />
    </div>
  );
}

function BookPage({
  backgroundUrl,
  narrativeText,
  interactionComponent,
  interactionValue,
  onInteractionChange,
  interactionDisabled,
  side,
}) {
  const pageImage = side === "left" ? leftPageImage : rightPageImage;

  return (
    <div className={`book-page book-page--${side}`}>
      {backgroundUrl ? (
        <img
          alt=""
          aria-hidden="true"
          className="book-page-illustration"
          src={backgroundUrl}
        />
      ) : (
        <img alt="" aria-hidden="true" className="book-page-frame" src={pageImage} />
      )}
      <div className="book-page-content book-page-content--interactive">
        {narrativeText ? <p className="book-page-narrative">{narrativeText}</p> : null}
        <InteractionLayer
          component={interactionComponent}
          disabled={interactionDisabled}
          onChange={onInteractionChange}
          value={interactionValue}
        />
      </div>
    </div>
  );
}

const defaultPages = Array.from({ length: 8 }, () => null);

function collectBlobUrls(pages) {
  return pages
    .filter((page) => page?.backgroundUrl?.startsWith("blob:"))
    .map((page) => page.backgroundUrl);
}

function revokeBlobUrls(urls) {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
}

function seedComponentResponses(storyState) {
  const responses = {};
  const history = storyState?.history ?? [];

  for (const scene of history) {
    const component = scene.interaction_component;
    if (!component) continue;

    if (component.response_text) {
      responses[component.id] = component.response_text;
    } else if (component.response_image?.url) {
      responses[component.id] = component.response_image.url;
    }
  }

  return responses;
}

async function resolveAuthenticatedImageUrl(path, timeoutMs = 15000) {
  const accessToken = localStorage.getItem("access_token");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      credentials: "include",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar la ilustración");
    }

    return URL.createObjectURL(await response.blob());
  } finally {
    clearTimeout(timeout);
  }
}

async function storyStateToPages(storyState) {
  const pages = defaultPages.map((page) => (page ? { ...page } : null));
  const history = storyState?.history ?? [];

  for (let index = 0; index < history.length; index += 1) {
    const scene = history[index];
    const pageIndex = index + 1;

    if (pageIndex >= pages.length - 1) {
      break;
    }

    const text = Array.isArray(scene.texts)
      ? scene.texts.filter(Boolean).join("\n")
      : scene.texts || "";

    let backgroundUrl = null;
    const rawUrl = scene.background_image?.url;

    if (rawUrl) {
      try {
        backgroundUrl = await resolveAuthenticatedImageUrl(rawUrl);
      } catch (error) {
        console.error(error);
      }
    }

    pages[pageIndex] = {
      text,
      backgroundUrl,
      sceneIndex: index,
      interactionComponent: scene.interaction_component ?? null,
    };
  }

  return pages;
}

function parseSseChunk(chunk, onEvent) {
  const blocks = chunk.split("\n\n");

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventName = "message";
    let data = "";

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    if (!data) continue;

    try {
      onEvent(eventName, JSON.parse(data));
    } catch {
      onEvent(eventName, data);
    }
  }
}

async function streamContinueDraft({ draftId, userAction, title, imageFile, onEvent, signal }) {
  const accessToken = localStorage.getItem("access_token");
  const formData = new FormData();

  formData.append("user_action", JSON.stringify(userAction));
  if (title) formData.append("title", title);
  if (imageFile) formData.append("image", imageFile);

  const response = await fetch(`/api/v1/drafts/${draftId}/continue`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const detail = payload?.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).join(", ")
          : "No se pudo continuar la historia",
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("La respuesta del servidor no es un stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lastSeparator = buffer.lastIndexOf("\n\n");

    if (lastSeparator === -1) continue;

    const complete = buffer.slice(0, lastSeparator + 2);
    buffer = buffer.slice(lastSeparator + 2);
    parseSseChunk(complete, onEvent);
  }

  if (buffer.trim()) {
    parseSseChunk(buffer, onEvent);
  }
}

export function StoryBookPreview({ draftId, onDraftActivityChange }) {
  const [pages, setPages] = useState(() => [...defaultPages]);
  const [coverPhotoFile, setCoverPhotoFile] = useState(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(null);
  const [coverTitle, setCoverTitle] = useState(DEFAULT_STORY_TITLE);
  const [selectedApiKey, setSelectedApiKey] = useState(null);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const leafCount = Math.ceil(pages.length / 2);
  const [currentLeaf, setCurrentLeaf] = useState(0);
  const [previewDirection, setPreviewDirection] = useState(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isGeneratingOnServer, setIsGeneratingOnServer] = useState(false);
  const [hasPersistedCover, setHasPersistedCover] = useState(false);
  const [serverSceneCount, setServerSceneCount] = useState(0);
  const [componentResponses, setComponentResponses] = useState({});
  const continueAbortRef = useRef(null);
  const storyStateRef = useRef(null);
  const blobUrlsRef = useRef([]);
  const hasContinuedRef = useRef(false);
  const skipTitlePersistRef = useRef(true);
  const interactionPersistTimersRef = useRef({});
  const coverUploadRequestRef = useRef(0);

  const reportDraftActivity = useCallback(
    (overrides = {}) => {
      if (!onDraftActivityChange) return;

      const storyState = overrides.storyState ?? storyStateRef.current;
      const hasHistory = (storyState?.history?.length ?? 0) > 0;
      const hasCoverSetup = Boolean(storyState?.current_scene);
      const nextTitle = overrides.coverTitle ?? coverTitle;
      const hasLocalEdits =
        Boolean(overrides.coverPhotoFile ?? coverPhotoFile) ||
        Boolean(overrides.coverPhotoUrl ?? coverPhotoUrl) ||
        (nextTitle.trim() !== "" && nextTitle.trim() !== DEFAULT_STORY_TITLE);

      onDraftActivityChange({
        hasProgress:
          hasContinuedRef.current || hasHistory || hasCoverSetup || hasLocalEdits,
        canSave: hasContinuedRef.current || hasHistory || hasCoverSetup,
        coverTitle: nextTitle,
      });
    },
    [coverPhotoFile, coverPhotoUrl, coverTitle, onDraftActivityChange],
  );

  const applyCoverFromStoryState = useCallback(async (storyState) => {
    const rawCoverUrl = extractCoverImageUrl(storyState);
    if (!rawCoverUrl) {
      setCoverPhotoUrl(null);
      return;
    }

    try {
      const blobUrl = await resolveAuthenticatedImageUrl(rawCoverUrl);
      blobUrlsRef.current.push(blobUrl);
      setCoverPhotoUrl(blobUrl);
      setCoverPhotoFile(null);
    } catch (error) {
      console.error(error);
      setCoverPhotoUrl(null);
    }
  }, []);

  const applyDraftPayload = useCallback(
    async (payload) => {
      const storyState = payload.story_state;
      const historyLength = storyState.history?.length ?? 0;

      storyStateRef.current = storyState;
      setServerSceneCount(historyLength);
      setHasPersistedCover(Boolean(extractCoverImageUrl(storyState)));

      if (payload.title) {
        setCoverTitle(payload.title);
      }

      const generating = Boolean(payload.is_generating);
      setIsGeneratingOnServer(generating);
      setIsContinuing(generating);

      if (historyLength > 0) {
        hasContinuedRef.current = true;
      }

      reportDraftActivity({
        storyState,
        coverTitle: payload.title ?? undefined,
      });

      await applyCoverFromStoryState(storyState);

      if (historyLength > 0) {
        const nextPages = await storyStateToPages(storyState);
        revokeBlobUrls(blobUrlsRef.current);
        blobUrlsRef.current = collectBlobUrls(nextPages);
        setPages(nextPages);
        setComponentResponses(seedComponentResponses(storyState));
        setCurrentLeaf(Math.ceil(historyLength / 2));
      } else {
        setComponentResponses(seedComponentResponses(storyState));
      }
    },
    [applyCoverFromStoryState, reportDraftActivity],
  );

  const applyDraftPayloadRef = useRef(applyDraftPayload);
  applyDraftPayloadRef.current = applyDraftPayload;

  const zIndexes = useMemo(
    () => pages.map((_, index) => (index % 2 === 0 ? pages.length - index : undefined)),
    [pages.length],
  );

  const flippedPages = useMemo(
    () => new Set(Array.from({ length: currentLeaf * 2 }, (_, index) => index)),
    [currentLeaf]
  );

  const previewPageIndex =
    previewDirection === "next" ? currentLeaf * 2 : currentLeaf * 2 - 1;

  const showPreview = (direction) => {
    if (direction === "previous" && currentLeaf === 0) return;
    if (direction === "next" && currentLeaf === leafCount) return;

    setPreviewDirection(direction);
  };

  const hidePreview = () => {
    setPreviewDirection(null);
  };

  const latestSceneIndex = useMemo(() => {
    let maxIndex = -1;
    for (const page of pages) {
      if (page?.sceneIndex != null) {
        maxIndex = Math.max(maxIndex, page.sceneIndex);
      }
    }
    return maxIndex;
  }, [pages]);

  const isBeforeFirstScene = useMemo(
    () =>
      serverSceneCount === 0 &&
      !pages.some((page) => page?.sceneIndex != null),
    [pages, serverSceneCount],
  );

  const hasCoverSetupReady = useMemo(
    () =>
      isCoverSetupComplete(coverPhotoFile, coverPhotoUrl, coverTitle, hasPersistedCover),
    [coverPhotoFile, coverPhotoUrl, coverTitle, hasPersistedCover],
  );

  const isContinueBlocked =
    isBeforeFirstScene && !hasCoverSetupReady;

  const persistInteractionResponse = useCallback(
    async (componentId, value, component) => {
      if (!draftId || !component) return;

      try {
        let payload;
        if (component.type === "image_input" && value instanceof File) {
          payload = await updateDraftInteraction(draftId, componentId, {
            imageFile: value,
          });
        } else if (typeof value === "string") {
          payload = await updateDraftInteraction(draftId, componentId, {
            text: value,
          });
        } else {
          return;
        }

        if (payload?.story_state) {
          storyStateRef.current = payload.story_state;
          setComponentResponses(seedComponentResponses(payload.story_state));
        }
      } catch (error) {
        console.error(error);
        toast.error("No se pudo guardar tu respuesta");
      }
    },
    [draftId],
  );

  const handleComponentChange = useCallback(
    (componentId, value, component) => {
      setComponentResponses((current) => ({
        ...current,
        [componentId]: value,
      }));

      clearTimeout(interactionPersistTimersRef.current[componentId]);
      const delay = component?.type === "image_input" ? 0 : 400;
      interactionPersistTimersRef.current[componentId] = setTimeout(() => {
        persistInteractionResponse(componentId, value, component);
      }, delay);
    },
    [persistInteractionResponse],
  );

  const continueStory = useCallback(async () => {
    if (isContinuing || isGeneratingOnServer || !selectedApiKey || !draftId || !isDraftReady) return;

    continueAbortRef.current?.abort();
    const controller = new AbortController();
    continueAbortRef.current = controller;
    setIsContinuing(true);

    try {
      let streamError = null;
      const isFirstContinue = !hasContinuedRef.current;
      const trimmedTitle = coverTitle.trim();
      let imageFile;
      let titleForRequest;
      let userAction;

      if (isFirstContinue) {
        if (!hasCoverSetupReady) {
          toast.error("Añade una foto de portada y un título antes de continuar");
          return;
        }

        if (trimmedTitle && trimmedTitle !== DEFAULT_STORY_TITLE) {
          titleForRequest = trimmedTitle;
        }

        userAction = {
          action_type: "cover_setup",
          text:
            trimmedTitle && trimmedTitle !== DEFAULT_STORY_TITLE
              ? trimmedTitle
              : null,
        };
        imageFile = coverPhotoFile ?? undefined;
      } else {
        const latestScene = storyStateRef.current?.history?.at(-1);
        const component = latestScene?.interaction_component;

        if (component) {
          const responseValue = componentResponses[component.id];
          if (!isInteractionComplete(component, responseValue)) {
            toast.error("Responde a la pregunta de la escena antes de continuar");
            return;
          }

          userAction = buildUserActionFromResponse(component, responseValue);
          if (component.type === "image_input" && responseValue instanceof File) {
            imageFile = responseValue;
          }
        } else {
          userAction = { action_type: "advance" };
        }
      }

      await streamContinueDraft({
        draftId,
        userAction,
        title: titleForRequest,
        imageFile,
        signal: controller.signal,
        onEvent: (eventName, data) => {
          if (eventName === "done" && data.story_state) {
            hasContinuedRef.current = true;
            storyStateRef.current = data.story_state;
            setIsGeneratingOnServer(false);
            setServerSceneCount(data.story_state.history?.length ?? 0);
            reportDraftActivity({ storyState: data.story_state });
            storyStateToPages(data.story_state)
              .then((nextPages) => {
                revokeBlobUrls(blobUrlsRef.current);
                blobUrlsRef.current = collectBlobUrls(nextPages);
                setPages(nextPages);
                setComponentResponses(seedComponentResponses(data.story_state));
                const sceneCount = data.story_state.history?.length ?? 0;
                if (sceneCount > 0) {
                  setCurrentLeaf(Math.ceil(sceneCount / 2));
                }
              })
              .catch((error) => {
                console.error(error);
                toast.error("No se pudieron actualizar las páginas del libro");
              });
          }
          if (eventName === "error") {
            streamError = new Error(data.detail || "Error al continuar la historia");
          }
        },
      });

      if (streamError) {
        throw streamError;
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        if (error.message?.includes("generación en curso")) {
          setIsGeneratingOnServer(true);
        }
        toast.error(error.message);
      }
    } finally {
      if (continueAbortRef.current === controller) {
        continueAbortRef.current = null;
      }
      setIsContinuing(false);
    }
  }, [
    componentResponses,
    coverPhotoFile,
    coverTitle,
    draftId,
    hasCoverSetupReady,
    isContinuing,
    isGeneratingOnServer,
    isDraftReady,
    reportDraftActivity,
    selectedApiKey,
  ]);

  useEffect(() => {
    let isMounted = true;

    apiRequest("/api/v1/users/me/api-keys")
      .then((apiKeys) => {
        if (!isMounted) return;
        setSelectedApiKey(apiKeys.find((apiKey) => apiKey.is_selected) ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setSelectedApiKey(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingApiKey(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!draftId) {
      setIsDraftReady(false);
      return undefined;
    }

    setIsDraftReady(false);
    skipTitlePersistRef.current = true;

    let cancelled = false;

    loadDraft(apiRequest, draftId)
      .then((payload) => {
        if (cancelled) return;
        setIsDraftReady(true);
        applyDraftPayloadRef.current(payload).catch((error) => {
          console.error(error);
          toast.error("No se pudieron cargar todas las ilustraciones del borrador");
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        toast.error("No se pudo cargar el borrador");
        setIsDraftReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [draftId]);

  useEffect(() => {
    if (!draftId || !isDraftReady || !isGeneratingOnServer) return undefined;

    const pollDraft = () => {
      loadDraft(apiRequest, draftId)
        .then((payload) => {
          if (!payload.is_generating) {
            applyDraftPayloadRef.current(payload).catch((error) => {
              console.error(error);
            });
          }
        })
        .catch((error) => {
          console.error(error);
        });
    };

    pollDraft();
    const interval = setInterval(pollDraft, 2000);

    return () => clearInterval(interval);
  }, [draftId, isDraftReady, isGeneratingOnServer]);

  useEffect(() => {
    if (!draftId || !isDraftReady) return undefined;

    if (skipTitlePersistRef.current) {
      skipTitlePersistRef.current = false;
      return undefined;
    }

    const timeout = setTimeout(() => {
      updateDraftSetup(draftId, { title: coverTitle.trim() })
        .then((payload) => {
          if (payload?.story_state) {
            storyStateRef.current = payload.story_state;
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }, 400);

    return () => clearTimeout(timeout);
  }, [coverTitle, draftId, isDraftReady]);

  useEffect(() => {
    reportDraftActivity();
  }, [coverPhotoFile, coverPhotoUrl, coverTitle, reportDraftActivity]);

  useEffect(() => {
    return () => {
      continueAbortRef.current?.abort();
      revokeBlobUrls(blobUrlsRef.current);
      for (const timer of Object.values(interactionPersistTimersRef.current)) {
        clearTimeout(timer);
      }
    };
  }, []);

  const handleCoverPhotoChange = useCallback(
    async (photo) => {
      if (!draftId || !photo) return;

      setCoverPhotoFile(photo);
      reportDraftActivity({ coverPhotoFile: photo });

      const requestId = coverUploadRequestRef.current + 1;
      coverUploadRequestRef.current = requestId;

      try {
        const payload = await updateDraftSetup(draftId, { imageFile: photo });
        if (coverUploadRequestRef.current !== requestId) return;

        storyStateRef.current = payload.story_state;
        setHasPersistedCover(Boolean(extractCoverImageUrl(payload.story_state)));
        await applyCoverFromStoryState(payload.story_state);
        reportDraftActivity({ storyState: payload.story_state });
      } catch (error) {
        console.error(error);
        toast.error(error.message || "No se pudo guardar la portada");
      }
    },
    [applyCoverFromStoryState, draftId, reportDraftActivity],
  );

  return (
    <section className="story-book-stage">
      <div className="book bound" aria-label="Libro interactivo">
        <div className="pages">
          {pages.map((content, index) => (
            <div
              className={[
                "page",
                flippedPages.has(index) ? "flipped" : "",
                previewPageIndex === index ? `preview-${previewDirection}` : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={index}
              style={{ zIndex: zIndexes[index] }}
            >
              {index === 0 ? (
                <BookCover />
              ) : index === pages.length - 1 ? (
                <BookBackCover />
              ) : (
                <BookPage
                  backgroundUrl={content?.backgroundUrl}
                  interactionComponent={content?.interactionComponent}
                  interactionDisabled={content?.sceneIndex !== latestSceneIndex}
                  interactionValue={
                    content?.interactionComponent
                      ? componentResponses[content.interactionComponent.id]
                      : undefined
                  }
                  narrativeText={content?.text}
                  onInteractionChange={(value) => {
                    if (!content?.interactionComponent) return;
                    handleComponentChange(
                      content.interactionComponent.id,
                      value,
                      content.interactionComponent,
                    );
                  }}
                  side={index % 2 === 0 ? "right" : "left"}
                />
              )}
            </div>
          ))}
          <BookCoverEditor
            coverPhotoFile={coverPhotoFile}
            coverPhotoUrl={coverPhotoUrl}
            coverTitle={coverTitle}
            isPreviewing={currentLeaf === 0 && previewDirection === "next"}
            isVisible={currentLeaf === 0}
            onCoverPhotoChange={handleCoverPhotoChange}
            onCoverTitleChange={(title) => {
              setCoverTitle(title);
              reportDraftActivity({ coverTitle: title });
            }}
          />
        </div>
      </div>

      <div className="book-controls-wrap">
        <div className="book-controls" aria-label="Controles del libro">
          <button
            aria-label="Pagina anterior"
            className="book-control"
            disabled={currentLeaf === 0}
            onBlur={hidePreview}
            onClick={() => setCurrentLeaf((leaf) => Math.max(leaf - 1, 0))}
            onFocus={() => showPreview("previous")}
            onMouseEnter={() => showPreview("previous")}
            onMouseLeave={hidePreview}
            title="Pagina anterior"
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            aria-label="Continuar historia"
            className="book-control book-control-continue"
            disabled={
              isContinuing ||
              isGeneratingOnServer ||
              isLoadingApiKey ||
              !selectedApiKey ||
              !draftId ||
              !isDraftReady ||
              isContinueBlocked
            }
            onClick={continueStory}
            title={
              isContinuing || isGeneratingOnServer
                ? "Generando la siguiente escena..."
                : isContinueBlocked
                  ? "Añade una foto de portada y un título para empezar"
                  : "Continuar historia"
            }
            type="button"
          >
            {isContinuing || isGeneratingOnServer ? "Generando..." : "Continuar historia"}
          </button>
          <button
            aria-label="Pagina siguiente"
            className="book-control"
            disabled={currentLeaf === leafCount}
            onBlur={hidePreview}
            onClick={() => setCurrentLeaf((leaf) => Math.min(leaf + 1, leafCount))}
            onFocus={() => showPreview("next")}
            onMouseEnter={() => showPreview("next")}
            onMouseLeave={hidePreview}
            title="Pagina siguiente"
            type="button"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <p className="book-api-key-info" aria-live="polite">
          {isLoadingApiKey
            ? "Comprobando API key..."
            : selectedApiKey
              ? `API key activa: ${selectedApiKey.label} (${selectedApiKey.masked_key})`
              : "No hay API key seleccionada. Configúrala en tu perfil."}
        </p>
      </div>
    </section>
  );
}
