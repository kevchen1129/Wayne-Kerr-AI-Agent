"use client";

import { AnalysisMode, Thread } from "@/lib/types";
import { cx, formatTime } from "@/lib/utils";

export type ToolOption = {
  id: AnalysisMode;
  title: string;
  description: string;
};

type SidebarProps = {
  tools: ToolOption[];
  activeToolId: ToolOption["id"];
  onSelectTool: (id: ToolOption["id"]) => void;
  brand: {
    name: string;
    subtitle?: string;
    logoSrc: string;
  };
  labels: {
    coreWorkflows: string;
    newChat: string;
    recentChats: string;
    updated: string;
    prototypeNote: string;
  };
  threads: Thread[];
  activeThreadId: string;
  isOpen: boolean;
  onClose: () => void;
  onNewThread: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
};

export function Sidebar({
  tools,
  activeToolId,
  onSelectTool,
  brand,
  labels,
  threads,
  activeThreadId,
  isOpen,
  onClose,
  onNewThread,
  onSelectThread,
  onDeleteThread
}: SidebarProps) {
  return (
    <>
      <div
        className={cx(
          "fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm transition-opacity md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!isOpen}
        onClick={onClose}
      />
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-slate-200/70 bg-white/90 p-4 shadow-glow backdrop-blur transition-transform dark:border-slate-800 dark:bg-slate-950/90 md:static md:flex md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <img
              src={brand.logoSrc}
              alt={`${brand.name} logo`}
              className="h-9 w-auto"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {brand.name}
              </div>
              {brand.subtitle && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {brand.subtitle}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200/70 p-2 text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-800 dark:text-slate-300 md:hidden"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{labels.coreWorkflows}</div>
          <div className="mt-3 space-y-3">
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool.id)}
                className={cx(
                  "w-full rounded-3xl border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]",
                  tool.id === activeToolId
                    ? "border-slate-900 bg-slate-900 text-white shadow-glow dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border-slate-200/80 bg-white/80 text-slate-700 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
                )}
              >
                <div className="text-sm font-semibold">{tool.title}</div>
                <div
                  className={cx(
                    "mt-1 text-xs",
                    tool.id === activeToolId ? "text-white/80 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  {tool.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onNewThread}
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100"
        >
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
            +
          </span>
          {labels.newChat}
        </button>

        <div className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-400">{labels.recentChats}</div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={cx(
                "group flex cursor-pointer items-center justify-between gap-2 rounded-2xl border px-3 py-3 text-sm transition",
                thread.id === activeThreadId
                  ? "border-slate-900 bg-slate-900 text-white shadow-glow dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-transparent bg-white/60 text-slate-700 hover:border-slate-200 hover:bg-white dark:bg-slate-900/40 dark:text-slate-200 dark:hover:border-slate-700"
              )}
              onClick={() => onSelectThread(thread.id)}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{thread.title}</div>
                <div className="text-xs text-slate-400 group-hover:text-slate-500 dark:text-slate-400">
                  {labels.updated} {formatTime(thread.updatedAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteThread(thread.id);
                }}
                className={cx(
                  "rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:hover:border-slate-700 dark:hover:text-slate-200",
                  thread.id === activeThreadId && "text-white/80 hover:text-white dark:text-slate-600"
                )}
                aria-label={`Delete ${thread.title}`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-slate-400">
          {labels.prototypeNote}
        </div>
      </aside>
    </>
  );
}
