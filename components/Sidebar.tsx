"use client";

import { useEffect, useState } from "react";
import { Thread } from "@/lib/types";
import { cx, formatTime } from "@/lib/utils";

type SidebarProps = {
  brand: {
    name: string;
    subtitle?: string;
    logoSrc: string;
  };
  labels: {
    newChat: string;
    recentChats: string;
    updated: string;
    prototypeNote: string;
    searchChats: string;
    share: string;
    rename: string;
    delete: string;
    save: string;
    cancel: string;
    renamePlaceholder: string;
  };
  threads: Thread[];
  activeThreadId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  onDeleteThread: (id: string) => void;
  onRenameThread: (id: string, title: string) => void;
  onShareThread: (id: string) => void;
};

export function Sidebar({
  brand,
  labels,
  threads,
  activeThreadId,
  isOpen,
  onClose,
  onSelectThread,
  onNewChat,
  onDeleteThread,
  onRenameThread,
  onShareThread
}: SidebarProps) {
  const [mounted, setMounted] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setOpenMenuId(null);
      setRenameId(null);
      setRenameValue("");
    }
  }, [isOpen]);

  const startRename = (thread: Thread) => {
    setRenameId(thread.id);
    setRenameValue(thread.title);
    setOpenMenuId(thread.id);
  };

  const cancelRename = () => {
    setRenameId(null);
    setRenameValue("");
  };

  const submitRename = (thread: Thread) => {
    const next = renameValue.trim();
    if (!next) return;
    onRenameThread(thread.id, next);
    setOpenMenuId(null);
    setRenameId(null);
  };

  const filteredThreads = threads.filter((thread) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return thread.title.toLowerCase().includes(query);
  });

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
          "fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-slate-200/70 bg-white/90 p-3 shadow-glow backdrop-blur transition-transform dark:border-slate-800 dark:bg-slate-950/90 md:static md:flex md:translate-x-0 md:p-4",
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

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {labels.newChat}
          </button>
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={labels.searchChats}
              className="w-full rounded-2xl border border-slate-200/80 bg-white/80 py-2 pl-10 pr-3 text-sm text-slate-700 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-5 text-xs uppercase tracking-[0.2em] text-slate-400">{labels.recentChats}</div>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {filteredThreads.map((thread) => (
            <div
              key={thread.id}
              className={cx(
                "group relative flex cursor-pointer items-center justify-between gap-2 rounded-2xl border px-3 py-3 text-sm transition",
                thread.id === activeThreadId
                  ? "border-slate-900 bg-slate-900 text-white shadow-glow dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-transparent bg-white/60 text-slate-700 hover:border-slate-200 hover:bg-white dark:bg-slate-900/40 dark:text-slate-200 dark:hover:border-slate-700"
              )}
              onClick={() => {
                setOpenMenuId(null);
                onSelectThread(thread.id);
              }}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{thread.title}</div>
                <div className="text-xs text-slate-400 group-hover:text-slate-500 dark:text-slate-400">
                  {labels.updated} {mounted ? formatTime(thread.updatedAt) : "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuId((prev) => (prev === thread.id ? null : thread.id));
                  setRenameId(null);
                  setRenameValue("");
                }}
                className={cx(
                  "flex h-9 w-9 items-center justify-center rounded-full text-base font-semibold leading-none text-slate-400 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:hover:bg-slate-800 dark:hover:text-slate-200",
                  thread.id === activeThreadId &&
                    "opacity-100 text-white/90 hover:bg-white/15 hover:text-white dark:text-slate-600"
                )}
                aria-label="More options"
                aria-expanded={openMenuId === thread.id}
              >
                <span className="flex items-center gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                </span>
              </button>
              {openMenuId === thread.id && (
                <div
                  className="absolute right-3 top-12 z-20 w-44 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-xl dark:border-slate-800 dark:bg-slate-950"
                  onClick={(event) => event.stopPropagation()}
                >
                  {renameId === thread.id ? (
                    <div className="space-y-2">
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            submitRename(thread);
                          }
                          if (event.key === "Escape") {
                            cancelRename();
                          }
                        }}
                        placeholder={labels.renamePlaceholder}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => submitRename(thread)}
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-900 px-2 py-2 font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900"
                        >
                          {labels.save}
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="flex-1 rounded-xl border border-slate-200 px-2 py-2 font-semibold text-slate-600 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:text-slate-200"
                        >
                          {labels.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          onShareThread(thread.id);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <span>{labels.share}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startRename(thread)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <span>{labels.rename}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteThread(thread.id);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      >
                        <span>{labels.delete}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {filteredThreads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200/80 bg-white/70 px-3 py-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              No chats found
            </div>
          )}
        </div>

        <div className="mt-4 text-xs text-slate-400">
          {labels.prototypeNote}
        </div>
      </aside>
    </>
  );
}
