import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

function BookPage({ children, side }) {
  const pageImage = side === "left" ? leftPageImage : rightPageImage;

  return (
    <div className="book-page">
      <img alt="" aria-hidden="true" src={pageImage} />
      {children ? <div className="book-page-content">{children}</div> : null}
    </div>
  );
}

const pages = Array.from({ length: 8 }, () => null);

export function StoryBookPreview() {
  const leafCount = Math.ceil(pages.length / 2);
  const [currentLeaf, setCurrentLeaf] = useState(0);
  const [previewDirection, setPreviewDirection] = useState(null);

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
                <BookPage side={index % 2 === 0 ? "right" : "left"}>{content}</BookPage>
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
