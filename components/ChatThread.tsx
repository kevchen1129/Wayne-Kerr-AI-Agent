"use client";

import { useEffect, useRef } from "react";
import { ComposerDraft, Message } from "@/lib/types";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageItem } from "@/components/MessageItem";
import { Composer } from "@/components/Composer";

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
  labels: {
    analyzing: string;
    result: string;
    user: string;
    assistant: string;
  };
  locale: "zh" | "en";
  localeLabel: string;
  headerLabels: {
    activeThread: string;
    export: string;
    clear: string;
    edit: string;
  };
  onToggleLocale: () => void;
  onEditWorkflow: () => void;
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
  labels,
  locale,
  localeLabel,
  headerLabels,
  onToggleLocale,
  onEditWorkflow,
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
        onEditWorkflow={onEditWorkflow}
        labels={headerLabels}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onImageClick={onImageClick}
            onInsertSummary={onInsertSummary}
            labels={labels}
          />
        ))}
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
