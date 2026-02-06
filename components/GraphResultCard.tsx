"use client";

import { useMemo, useState } from "react";
import { GraphResult } from "@/lib/types";

type GraphResultCardProps = {
  result: GraphResult;
  locale: "zh" | "en";
  onInsertSummary: (summary: string) => void;
};

const resolveText = (value: GraphResult["title"] | GraphResult["summaryText"] | undefined, locale: "zh" | "en") => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value.en ?? value.zh ?? "";
};

type SummaryCard = NonNullable<GraphResult["summaryCards"]>[number];

const resolveCardText = (
  value: SummaryCard["label"] | SummaryCard["value"],
  locale: "zh" | "en"
) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value.en ?? value.zh ?? "";
};

function buildSummary(result: GraphResult, locale: "zh" | "en"): string {
  const title = resolveText(result.title, locale) || result.graphTypeGuess;
  const summaryText = resolveText(result.summaryText, locale);
  const parts: string[] = [title];
  if (result.resonanceFrequency) parts.push(`${locale === "zh" ? "共振頻率" : "Resonance"} ${result.resonanceFrequency}`);
  if (result.saturationCurrent) parts.push(`${locale === "zh" ? "飽和電流" : "Saturation"} ${result.saturationCurrent}`);
  if (summaryText) parts.push(summaryText);
  return parts.join(". ");
}

export function GraphResultCard({ result, locale, onInsertSummary }: GraphResultCardProps) {
  const [copied, setCopied] = useState<"json" | "summary" | null>(null);
  const isDcBias =
    result.graphTypeGuess.toLowerCase().includes("dc bias") ||
    (Boolean(result.saturationCurrent) && !result.resonanceFrequency);
  const summaryCards = result.summaryCards ?? [];
  const interpretationText = resolveText(result.summaryText, locale) || "";
  const buttonLabels =
    locale === "zh"
      ? {
          copyJson: "複製 JSON",
          copySummary: "複製摘要",
          insert: "插入對話",
          jsonCopied: "已複製 JSON",
          summaryCopied: "已複製摘要"
        }
      : {
          copyJson: "Copy JSON",
          copySummary: "Copy Summary",
          insert: "Insert to Chat",
          jsonCopied: "JSON copied",
          summaryCopied: "Summary copied"
        };

  const summary = useMemo(() => buildSummary(result, locale), [result, locale]);

  const handleCopy = async (type: "json" | "summary") => {
    const payload = type === "json" ? JSON.stringify(result, null, 2) : summary;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(type);
      window.setTimeout(() => setCopied(null), 1400);
    } catch (error) {
      console.error("Clipboard failed", error);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-glow backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {isDcBias ? (locale === "zh" ? "DC Bias 分析" : "DC Bias Analysis") : locale === "zh" ? "掃頻解析" : "Sweep Interpretation"}
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {resolveText(result.title, locale) || result.graphTypeGuess}
          </div>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
          {Math.round(result.confidence * 100)}% confidence
        </div>
      </div>

      {(result.resonanceFrequency || result.saturationCurrent) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {result.resonanceFrequency && (
            <div className="rounded-2xl border border-violet-200/80 bg-violet-50/80 px-4 py-2.5 dark:border-violet-600/40 dark:bg-violet-900/20">
              <div className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                {locale === "zh" ? "共振頻率" : "Resonance frequency"}
              </div>
              <div className="mt-1 font-semibold text-violet-900 dark:text-violet-100">
                {result.resonanceFrequency}
              </div>
            </div>
          )}
          {result.saturationCurrent && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-2.5 dark:border-amber-600/40 dark:bg-amber-900/20">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                {locale === "zh" ? "飽和電流" : "Saturation current"}
              </div>
              <div className="mt-1 font-semibold text-amber-900 dark:text-amber-100">
                {result.saturationCurrent}
              </div>
            </div>
          )}
        </div>
      )}

      {summaryCards.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {summaryCards.map((card, index) => {
            const tone =
              card.tone === "warning"
                ? "border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-100"
                : card.tone === "info"
                  ? "border-sky-200/80 bg-sky-50/80 text-sky-900 dark:border-sky-600/40 dark:bg-sky-900/20 dark:text-sky-100"
                  : "border-slate-200/70 bg-white/80 text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100";
            return (
              <div
                key={`${card.label}-${index}`}
                className={`rounded-2xl border px-4 py-3 ${tone}`}
              >
                <div className="text-[11px] uppercase tracking-[0.2em] opacity-70">
                  {resolveCardText(card.label, locale)}
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {resolveCardText(card.value, locale)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
        {result.recommendedMeasurementBand && (
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {isDcBias
                ? locale === "zh"
                  ? "建議掃描範圍"
                  : "Recommended sweep range"
                : locale === "zh"
                  ? "有效擬合頻段"
                  : "Valid modeling band"}
            </div>
            <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
              {result.recommendedMeasurementBand}
            </div>
          </div>
        )}

        {interpretationText && (
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {locale === "zh" ? "摘要" : "Summary"}
            </div>
            <p className="mt-2 text-slate-800 dark:text-slate-100">{interpretationText}</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleCopy("json")}
          className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {copied === "json" ? buttonLabels.jsonCopied : buttonLabels.copyJson}
        </button>
        <button
          type="button"
          onClick={() => handleCopy("summary")}
          className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {copied === "summary" ? buttonLabels.summaryCopied : buttonLabels.copySummary}
        </button>
        <button
          type="button"
          onClick={() => onInsertSummary(summary)}
          className="rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
        >
          {buttonLabels.insert}
        </button>
      </div>
    </div>
  );
}
