"use client";

import { cx } from "@/lib/utils";
import type { ToolOption } from "@/components/Sidebar";

type NewChatModalProps = {
  open: boolean;
  tools: ToolOption[];
  selectedId: ToolOption["id"];
  onSelect: (id: ToolOption["id"]) => void;
  onConfirm: () => void;
  onClose: () => void;
  labels: {
    title: string;
    subtitle: string;
    cancel: string;
    confirm: string;
  };
};

export function NewChatModal({
  open,
  tools,
  selectedId,
  onSelect,
  onConfirm,
  onClose,
  labels
}: NewChatModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-glow dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{labels.title}</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {labels.subtitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelect(tool.id)}
              className={cx(
                "rounded-3xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]",
                selectedId === tool.id
                  ? "border-slate-900 bg-slate-900 text-white shadow-glow dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-200/80 bg-white/80 text-slate-700 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              )}
            >
              <div className="text-sm font-semibold">{tool.title}</div>
              <div
                className={cx(
                  "mt-2 text-xs",
                  selectedId === tool.id ? "text-white/80 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"
                )}
              >
                {tool.description}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
          >
            {labels.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
