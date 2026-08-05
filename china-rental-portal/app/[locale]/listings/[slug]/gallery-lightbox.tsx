"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type GalleryItem = {
  src: string;
  label: string;
};

export function GalleryLightbox({
  gallery,
  altPrefix,
}: {
  gallery: GalleryItem[];
  altPrefix: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current === null ? 0 : (current + 1) % gallery.length));
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null ? 0 : (current - 1 + gallery.length) % gallery.length
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, gallery.length]);

  const activePhoto = activeIndex === null ? null : gallery[activeIndex];
  const activeDisplayIndex = activeIndex === null ? 0 : activeIndex + 1;

  return (
    <>
      <div className="trip-gallery">
        <button
          type="button"
          className="trip-gallery-main gallery-button"
          onClick={() => setActiveIndex(0)}
          aria-label={`${altPrefix} 1`}
        >
          <Image
            src={gallery[0].src}
            alt={gallery[0].label}
            fill
            sizes="(max-width: 980px) 100vw, 55vw"
            className="media-image"
          />
        </button>
        <div className="trip-gallery-side">
          {gallery.slice(1).map((photo, index) => (
            <button
              key={photo.label}
              type="button"
              className="trip-gallery-thumb gallery-button"
              onClick={() => setActiveIndex(index + 1)}
              aria-label={`${altPrefix} ${index + 2}`}
            >
              <Image
                src={photo.src}
                alt={photo.label}
                fill
                sizes="(max-width: 980px) 100vw, 22vw"
                className="media-image"
              />
            </button>
          ))}
        </div>
      </div>

      {activePhoto ? (
        <div className="lightbox-backdrop" role="dialog" aria-modal="true">
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setActiveIndex(null)}
            aria-label="Close image viewer"
          >
            ×
          </button>
          <button
            type="button"
            className="lightbox-nav left"
            onClick={() =>
              setActiveIndex((current) => (current === null ? 0 : (current - 1 + gallery.length) % gallery.length))
            }
            aria-label="Previous image"
          >
            ‹
          </button>
          <div className="lightbox-stage">
            <div className="lightbox-image-wrap">
              <Image
                src={activePhoto.src}
                alt={activePhoto.label}
                fill
                sizes="90vw"
                className="media-image lightbox-image"
              />
            </div>
            <div className="lightbox-caption">
              <strong>{activePhoto.label}</strong>
              <span>
                {activeDisplayIndex} / {gallery.length}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="lightbox-nav right"
            onClick={() => setActiveIndex((current) => (current === null ? 0 : (current + 1) % gallery.length))}
            aria-label="Next image"
          >
            ›
          </button>
        </div>
      ) : null}
    </>
  );
}
