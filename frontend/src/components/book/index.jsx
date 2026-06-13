import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import "./style.css";

const pages = [
  (
    <>
      <h1>Boyhood</h1>
      <h2>by Jason Hibbs</h2>
    </>
  ),
  null,
  null,
  null,
  null,
  null,
  (
    <>
      There was a boy
      <br />
      Who had it rough
    </>
  ),
  (
    <>
      His adventure
      <br />
      Was to be tough
    </>
  ),
  null,
  null,
  (
    <>
      He knew his Mother
      <br />
      Had left this land
    </>
  ),
  (
    <>
      He knew his Father
      <br />
      Like the back of his hand
    </>
  ),
  null,
  (
    <>
      There were monsters
      <br />
      He had to fight
    </>
  ),
  null,
  null,
  (
    <>
      He sometimes hid
      <br />
      He never cried
    </>
  ),
  (
    <>
      There was a boy
      <br />
      Who was afraid
    </>
  ),
  (
    <>
      Who wore armour
      <br />
      That he had made
    </>
  ),
  null,
  (
    <>
      There was a boy
      <br />
      Who met a girl
    </>
  ),
  null,
  (
    <>
      He met a girl
      <br />
      Who changed his world
    </>
  ),
  null,
  (
    <>
      Who saw the armour
      <br />
      And looked inside
    </>
  ),
  "And inside...",
  null,
  "There was a boy.",
  null,
  null,
  null,
  null,
];

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
              {content}
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
