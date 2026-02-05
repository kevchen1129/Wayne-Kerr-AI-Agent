"use client";

import { useEffect } from "react";

type ImageModalProps = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export function ImageModal({ src, alt, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full border border-slate-300/30 bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Close preview"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </button>
      <img src={src} alt={alt || "preview"} className="max-h-[80vh] w-auto rounded-3xl" />
    </div>
  );
}
