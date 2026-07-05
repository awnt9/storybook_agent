import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { apiRequest } from "../../lib/api";
import backCoverImage from "../../assets/book/back_cover.png";
import coverImage from "../../assets/book/cover.png";
import leftPageImage from "../../assets/book/left_page.png";
import rightPageImage from "../../assets/book/right_page.png";
import "./style.css";

const DEFAULT_STORY_TITLE = "Título del cuento";

function CoverPhotoInput({ photoFile, onPhotoChange }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl(null);
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(photoFile);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [photoFile]);

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
      <CoverPhotoInput onPhotoChange={onCoverPhotoChange} photoFile={coverPhotoFile} />
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

function BookPage({ backgroundUrl, children, side }) {
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
      {children ? <div className="book-page-content">{children}</div> : null}
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

async function resolveAuthenticatedImageUrl(path) {
  const accessToken = localStorage.getItem("access_token");
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar la ilustración");
  }

  return URL.createObjectURL(await response.blob());
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

    pages[pageIndex] = { text, backgroundUrl };
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

async function streamContinueHistory({ text, historyId, imageFile, onEvent, signal }) {
  const accessToken = localStorage.getItem("access_token");
  const formData = new FormData();

  if (text) formData.append("text", text);
  if (historyId) formData.append("history_id", historyId);
  if (imageFile) formData.append("image", imageFile);

  const response = await fetch("/api/v1/stories/continue-history", {
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

export function StoryBookPreview() {
  const [pages, setPages] = useState(() => [...defaultPages]);
  const [coverPhotoFile, setCoverPhotoFile] = useState(null);
  const [coverTitle, setCoverTitle] = useState(DEFAULT_STORY_TITLE);
  const [selectedApiKey, setSelectedApiKey] = useState(null);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);
  const leafCount = Math.ceil(pages.length / 2);
  const [currentLeaf, setCurrentLeaf] = useState(0);
  const [previewDirection, setPreviewDirection] = useState(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const continueAbortRef = useRef(null);
  const historyIdRef = useRef(null);
  const blobUrlsRef = useRef([]);

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

  const continueStory = useCallback(async () => {
    if (isContinuing || !selectedApiKey) return;

    continueAbortRef.current?.abort();
    const controller = new AbortController();
    continueAbortRef.current = controller;
    setIsContinuing(true);

    try {
      let streamError = null;
      const isFirstContinue = !historyIdRef.current;
      let text = "Continuar la historia con una nueva escena";
      let imageFile;

      if (isFirstContinue) {
        const trimmedTitle = coverTitle.trim();
        if (coverPhotoFile) {
          text =
            trimmedTitle && trimmedTitle !== DEFAULT_STORY_TITLE
              ? `Comienza la historia "${trimmedTitle}" con el protagonista de la foto de portada en un escenario amplio de fondo.`
              : "Comienza la historia con el protagonista de la foto de portada en un escenario amplio de fondo.";
          imageFile = coverPhotoFile;
        } else if (trimmedTitle && trimmedTitle !== DEFAULT_STORY_TITLE) {
          text = `Comienza la historia "${trimmedTitle}" con un escenario amplio de fondo.`;
        } else {
          text = "Comienza la historia con un escenario amplio de fondo.";
        }
      }

      await streamContinueHistory({
        text,
        historyId: historyIdRef.current,
        imageFile,
        signal: controller.signal,
        onEvent: (eventName, data) => {
          if (eventName === "start" && data.history_id) {
            historyIdRef.current = data.history_id;
          }
          if (eventName === "done" && data.story_state) {
            storyStateToPages(data.story_state)
              .then((nextPages) => {
                revokeBlobUrls(blobUrlsRef.current);
                blobUrlsRef.current = collectBlobUrls(nextPages);
                setPages(nextPages);
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
        toast.error(error.message);
      }
    } finally {
      if (continueAbortRef.current === controller) {
        continueAbortRef.current = null;
      }
      setIsContinuing(false);
    }
  }, [coverPhotoFile, coverTitle, isContinuing, selectedApiKey]);

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
    return () => {
      continueAbortRef.current?.abort();
      revokeBlobUrls(blobUrlsRef.current);
    };
  }, []);

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
                  side={index % 2 === 0 ? "right" : "left"}
                >
                  {content?.text}
                </BookPage>
              )}
            </div>
          ))}
          <BookCoverEditor
            coverPhotoFile={coverPhotoFile}
            coverTitle={coverTitle}
            isPreviewing={currentLeaf === 0 && previewDirection === "next"}
            isVisible={currentLeaf === 0}
            onCoverPhotoChange={setCoverPhotoFile}
            onCoverTitleChange={setCoverTitle}
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
            disabled={isContinuing || isLoadingApiKey || !selectedApiKey}
            onClick={continueStory}
            title="Continuar historia"
            type="button"
          >
            {isContinuing ? "Generando..." : "Continuar historia"}
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
