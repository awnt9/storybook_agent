import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import backCoverImage from "../../assets/book/back_cover.png";
import coverImage from "../../assets/book/cover.png";
import leftPageImage from "../../assets/book/left_page.png";
import rightPageImage from "../../assets/book/right_page.png";
import "./style.css";

function CoverPhotoInput() {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadPhoto = (photo) => {
    if (!photo?.type.startsWith("image/")) return;
    setPreviewUrl(URL.createObjectURL(photo));
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

function BookCoverEditor({ isVisible, isPreviewing }) {
  const [title, setTitle] = useState("Título del cuento");

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
      <CoverPhotoInput />
      <textarea
        aria-label="Título del cuento"
        className="cover-text-input cover-story-title-input"
        maxLength={35}
        onChange={(event) => setTitle(event.target.value)}
        onClick={(event) => event.currentTarget.select()}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        rows={2}
        spellCheck="false"
        tabIndex={isVisible ? 0 : -1}
        value={title}
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
    <div className="book-page">
      <img alt="" aria-hidden="true" className="book-page-frame" src={pageImage} />
      {backgroundUrl ? (
        <img
          alt=""
          aria-hidden="true"
          className="book-page-illustration"
          src={backgroundUrl}
        />
      ) : null}
      {children ? <div className="book-page-content">{children}</div> : null}
    </div>
  );
}

const defaultPages = Array.from({ length: 8 }, () => null);

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
    throw new Error(payload?.detail || "No se pudo continuar la historia");
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

export function StoryBookPreview({ pages = defaultPages }) {
  const leafCount = Math.ceil(pages.length / 2);
  const [currentLeaf, setCurrentLeaf] = useState(0);
  const [previewDirection, setPreviewDirection] = useState(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const continueAbortRef = useRef(null);
  const historyIdRef = useRef(null);

  const zIndexes = useMemo(
    () => pages.map((_, index) => (index % 2 === 0 ? pages.length - index : undefined)),
    []
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
    if (isContinuing) return;

    continueAbortRef.current?.abort();
    const controller = new AbortController();
    continueAbortRef.current = controller;
    setIsContinuing(true);

    try {
      let streamError = null;

      await streamContinueHistory({
        text: "Continuar la historia con una nueva escena",
        historyId: historyIdRef.current,
        signal: controller.signal,
        onEvent: (eventName, data) => {
          if (eventName === "start" && data.history_id) {
            historyIdRef.current = data.history_id;
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
        console.error(error);
      }
    } finally {
      if (continueAbortRef.current === controller) {
        continueAbortRef.current = null;
      }
      setIsContinuing(false);
    }
  }, [isContinuing]);

  useEffect(() => {
    return () => {
      continueAbortRef.current?.abort();
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
            isPreviewing={currentLeaf === 0 && previewDirection === "next"}
            isVisible={currentLeaf === 0}
          />
        </div>
      </div>

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
          disabled={isContinuing}
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
    </section>
  );
}
