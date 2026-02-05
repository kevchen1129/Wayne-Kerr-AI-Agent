"use client";

import { useEffect, useRef } from "react";
import { AnalysisMode, ComposerDraft, Message } from "@/lib/types";
import { cx } from "@/lib/utils";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageItem } from "@/components/MessageItem";
import { Composer } from "@/components/Composer";
import type { ToolOption } from "@/components/Sidebar";

const TypingIndicator = ({ label }: { label: string }) => (
  <div className="mx-auto w-full max-w-4xl px-4 py-3">
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-2 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
      <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
      <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
      <span className="ml-2">{label}</span>
    </div>
  </div>
);

type ChatThreadProps = {
  title: string;
  activeWorkflow: string;
  toolOptions: ToolOption[];
  activeToolId: AnalysisMode;
  onSelectTool: (id: AnalysisMode) => void;
  labels: {
    analyzing: string;
    result: string;
    user: string;
    assistant: string;
  };
  emptyState: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  locale: "zh" | "en";
  localeLabel: string;
  headerLabels: {
    activeThread: string;
    export: string;
    clear: string;
  };
  onToggleLocale: () => void;
  messages: Message[];
  isTyping: boolean;
  onOpenSidebar: () => void;
  onExport: () => void;
  onClear: () => void;
  onInsertSummary: (summary: string) => void;
  onImageClick: (src: string) => void;
  draft: ComposerDraft;
  onTextChange: (value: string) => void;
  onRemoveImage: (id: string) => void;
  onImagesSelected: (files: FileList) => void;
  onSend: () => void;
};

export function ChatThread({
  title,
  activeWorkflow,
  toolOptions,
  activeToolId,
  onSelectTool,
  labels,
  emptyState,
  locale,
  localeLabel,
  headerLabels,
  onToggleLocale,
  messages,
  isTyping,
  onOpenSidebar,
  onExport,
  onClear,
  onInsertSummary,
  onImageClick,
  draft,
  onTextChange,
  onRemoveImage,
  onImagesSelected,
  onSend
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0 && !isTyping;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length, isTyping]);

  return (
    <section className="flex h-screen flex-1 flex-col">
      <ChatHeader
        title={title}
        activeWorkflow={activeWorkflow}
        localeLabel={localeLabel}
        onOpenSidebar={onOpenSidebar}
        onExport={onExport}
        onClear={onClear}
        onToggleLocale={onToggleLocale}
        labels={headerLabels}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {isEmpty ? (
          <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col justify-center px-6 py-10">
            <div className="max-w-xl">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {emptyState.eyebrow}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {emptyState.title}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {emptyState.subtitle}
              </p>
            </div>
            <div className="mt-6 flex max-w-xl flex-col gap-3">
              {toolOptions.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onSelectTool(tool.id)}
                  className={cx(
                    "w-full rounded-2xl border px-4 py-4 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]",
                    tool.id === activeToolId
                      ? "border-slate-900 bg-slate-900 text-white shadow-glow dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                      : "border-slate-200/80 bg-white/90 text-slate-700 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200"
                  )}
                >
                  <div className="font-semibold">{tool.title}</div>
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
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onImageClick={onImageClick}
              onInsertSummary={onInsertSummary}
              labels={labels}
            />
          ))
        )}
        {isTyping && <TypingIndicator label={labels.analyzing} />}
      </div>
      <Composer
        draft={draft}
        mode={draft.mode}
        locale={locale}
        onTextChange={onTextChange}
        onSend={onSend}
        onRemoveImage={onRemoveImage}
        onImagesSelected={onImagesSelected}
        isBusy={isTyping}
      />
    </section>
  );
}
