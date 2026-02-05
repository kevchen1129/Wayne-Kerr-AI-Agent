"use client";

import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { AnalysisMode, ComposerDraft } from "@/lib/types";
import { cx } from "@/lib/utils";

const MODE_LABELS: Record<AnalysisMode, { zh: string; en: string }> = {
  identify_dut: { zh: "被斷元件測量建議", en: "DUT Measurement Setup" },
  interpret_graph: { zh: "等效電路", en: "Equivalent Circuit" },
  detect_resonance: { zh: "共振頻率偵測", en: "Resonance Detection" }
};

const MODE_HINTS: Record<AnalysisMode, { zh: string; en: string }> = {
  identify_dut: {
    zh: "上傳元件照片，辨識 R/L/C 並帶出建議量測模式、頻率、電平與工作範圍。",
    en: "Upload a part photo to identify R/L/C and get recommended mode, frequency, level, and working range."
  },
  interpret_graph: {
    zh: "上傳掃頻圖，判斷等效電路用途並建議 2/3/4 元件模型。",
    en: "Upload a sweep plot to suggest a 2/3/4‑element equivalent circuit model."
  },
  detect_resonance: {
    zh: "自動偵測主共振點並標示多個協振/反共振點。",
    en: "Detect the main resonance and mark multiple harmonic / anti‑resonance points."
  }
};

const MODE_BADGE: Record<AnalysisMode, string> = {
  identify_dut: "DUT",
  interpret_graph: "EQ",
  detect_resonance: "Res"
};

const MODE_BADGE_COLOR: Record<AnalysisMode, string> = {
  identify_dut: "bg-blue-600",
  interpret_graph: "bg-violet-600",
  detect_resonance: "bg-amber-600"
};

type ComposerProps = {
  draft: ComposerDraft;
  mode: AnalysisMode;
  locale: "zh" | "en";
  onTextChange: (value: string) => void;
  onSend: () => void;
  onRemoveImage: (id: string) => void;
  onImagesSelected: (files: FileList) => void;
  isBusy: boolean;
};

export function Composer({
  draft,
  mode,
  locale,
  onTextChange,
  onSend,
  onRemoveImage,
  onImagesSelected,
  isBusy
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const maxHeight = 6 * 24;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft.text]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onImagesSelected(event.target.files);
    }
    event.target.value = "";
  };

  const canSend = draft.text.trim().length > 0 || draft.images.length > 0;

  return (
    <div className="border-t border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {locale === "zh" ? "目前功能" : "Active workflow"}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
            {MODE_LABELS[mode][locale]}
          </div>
        </div>
        <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {locale === "zh" ? "請從左側切換" : "Switch from left panel"}
        </span>
      </div>

      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        {MODE_HINTS[mode][locale]}
      </p>

      {draft.images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {draft.images.map((image) => (
            <div
              key={image.id}
              className="group relative h-16 w-20 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 dark:border-slate-800 dark:bg-slate-900"
            >
              <img src={image.url} alt="preview" className="h-full w-full object-cover" />
              <span
                className={cx(
                  "absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow",
                  MODE_BADGE_COLOR[mode]
                )}
              >
                {MODE_BADGE[mode]}
              </span>
              <button
                type="button"
                onClick={() => onRemoveImage(image.id)}
                className="absolute right-1 top-1 rounded-full bg-slate-900/80 p-1 text-xs text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]"
                aria-label="Remove image"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          aria-label="Upload or capture image"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
            <path d="M12 11l3 3-3 3-3-3 3-3z" />
            <path d="M7 7l2-3h6l2 3" />
          </svg>
        </button>

        <div className="flex-1 rounded-3xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm transition focus-within:border-slate-300 focus-within:ring-2 focus-within:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft.text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={
              locale === "zh"
                ? mode === "identify_dut"
                  ? "例如：元件上印字、目標頻段、預期 L/C/R…"
                  : mode === "interpret_graph"
                    ? "例如：掃頻範圍、曲線型態、想要的等效電路複雜度…"
                    : "例如：想要標示幾個共振點、是否需要游標跳點說明…"
                : mode === "identify_dut"
                  ? "e.g. markings, target band, expected L/C/R..."
                  : mode === "interpret_graph"
                    ? "e.g. sweep range, curve type, desired model complexity..."
                    : "e.g. how many resonance points to mark..."
            }
            className="w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
        </div>

        <button
          type="button"
          disabled={!canSend || isBusy}
          onClick={onSend}
          className={cx(
            "flex h-12 shrink-0 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]",
            canSend && !isBusy
              ? "bg-slate-900 text-white hover:-translate-y-0.5 hover:shadow-glow dark:bg-slate-100 dark:text-slate-900"
              : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
          )}
        >
          {locale === "zh" ? "送出" : "Send"}
        </button>
      </div>
    </div>
  );
}
