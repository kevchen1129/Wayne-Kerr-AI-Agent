"use client";

import { useEffect, useState } from "react";
import { AnalysisMode, Message } from "@/lib/types";
import { cx, formatTime } from "@/lib/utils";
import { DUTResultCard } from "@/components/DUTResultCard";
import { GraphResultCard } from "@/components/GraphResultCard";

type MessageItemProps = {
  message: Message;
  onImageClick: (src: string) => void;
  onInsertSummary: (summary: string) => void;
  locale: "zh" | "en";
  labels: {
    user: string;
    assistant: string;
    result: string;
  };
};

const MODE_LABEL: Record<AnalysisMode, string> = {
  identify_dut: "DUT",
  interpret_graph: "Sweep",
  dc_bias_saturation: "DC Bias"
};

const MODE_COLOR: Record<AnalysisMode, string> = {
  identify_dut: "bg-blue-600",
  interpret_graph: "bg-violet-600",
  dc_bias_saturation: "bg-amber-600"
};

export function MessageItem({
  message,
  onImageClick,
  onInsertSummary,
  locale,
  labels
}: MessageItemProps) {
  const isUser = message.role === "user";
  const showFrame = message.type !== "dut_result" && message.type !== "graph_result";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-3">
      <div className={cx("flex", isUser ? "justify-end" : "justify-start")}>
        <div className={cx("w-full", isUser ? "max-w-xl" : "max-w-3xl")}>
          <div
            className={cx(
              showFrame &&
                "rounded-3xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70",
              isUser && showFrame && "border-slate-900/80 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
            )}
          >
            <div
              className={cx(
                "flex items-center justify-between text-[10px] uppercase tracking-[0.25em]",
                isUser
                  ? "text-white/70 dark:text-slate-600"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              <span>{isUser ? labels.user : labels.assistant}</span>
              <span>{mounted ? formatTime(message.createdAt) : "—"}</span>
            </div>

            <div className="mt-3">
              {message.type === "text" && (
                <p
                  className={cx(
                    "whitespace-pre-wrap text-sm leading-relaxed",
                    isUser ? "text-white/90 dark:text-slate-900" : "text-slate-800 dark:text-slate-100"
                  )}
                >
                  {message.text}
                </p>
              )}

              {message.type === "image" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => onImageClick(message.imageUrl)}
                    className={cx(
                      "overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]",
                      isUser ? "border-white/30 bg-white/20" : "dark:border-slate-800 dark:bg-slate-950"
                    )}
                  >
                    <img
                      src={message.imageUrl}
                      alt={message.caption || "uploaded image"}
                      className="h-44 w-64 rounded-2xl object-cover"
                      loading="lazy"
                    />
                  </button>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                    <span
                      className={cx(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold text-white",
                        MODE_COLOR[message.mode]
                      )}
                    >
                      {MODE_LABEL[message.mode]}
                    </span>
                    {message.caption && <span>{message.caption}</span>}
                  </div>
                </div>
              )}

              {message.type === "dut_result" && (
                <div className="mt-2">
                  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">{labels.result}</div>
                  <DUTResultCard result={message.result} onInsertSummary={onInsertSummary} />
                </div>
              )}

              {message.type === "graph_result" && (
                <div className="mt-2">
                  <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">{labels.result}</div>
                  <GraphResultCard result={message.result} locale={locale} onInsertSummary={onInsertSummary} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
