import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import backCoverImage from "../../assets/book/back_cover.png";
import coverImage from "../../assets/book/cover.png";
import leftPageImage from "../../assets/book/left_page.png";
import rightPageImage from "../../assets/book/right_page.png";
import "./style.css";

function BookCover() {
  return (
    <div className="book-cover">
      <img alt="Portada del cuento" src={coverImage} />
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
