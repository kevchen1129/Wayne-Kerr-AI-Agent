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

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const parseCurrentRange = (band?: string) => {
  if (!band) return null;
  const match = band.match(/([0-9]+(?:\.[0-9]+)?)\s*A\s*[–-]\s*([0-9]+(?:\.[0-9]+)?)\s*A/i);
  if (!match) return null;
  const min = Number.parseFloat(match[1]);
  const max = Number.parseFloat(match[2]);
  if (Number.isNaN(min) || Number.isNaN(max)) return null;
  return { min, max };
};

const formatNumber = (value: number, digits = 2) => {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(digits);
};

const resolveAxisCurrentRange = (
  dcBiasMeta: GraphResult["dcBiasMeta"],
  recommendedBand?: string
) => {
  if (!dcBiasMeta) return null;
  return (
    dcBiasMeta.axisRange?.current ??
    dcBiasMeta.currentRange ??
    (() => {
      const parsed = parseCurrentRange(recommendedBand);
      return parsed ? { min: parsed.min, max: parsed.max, unit: "A" } : { min: 0, max: 3, unit: "A" };
    })()
  );
};

const interpolateDropCurrent = (
  points: Array<{ current: number; inductance: number }>,
  targetInductance: number
) => {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.current - b.current);
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a.inductance === targetInductance) return a.current;
    const crosses =
      (a.inductance - targetInductance) * (b.inductance - targetInductance) < 0;
    if (crosses) {
      const t = (targetInductance - a.inductance) / (b.inductance - a.inductance);
      return a.current + t * (b.current - a.current);
    }
  }
  return null;
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
  const dropPercent = 20;
  const isDcBias =
    result.graphTypeGuess.toLowerCase().includes("dc bias") ||
    (Boolean(result.saturationCurrent) && !result.resonanceFrequency);
  const summaryCards = result.summaryCards ?? [];
  const dcBiasMeta = result.dcBiasMeta;
  const dropPoint = dcBiasMeta?.dropPoints.find((point) => point.percent === dropPercent);
  const interpretationText = resolveText(result.summaryText, locale) || "";
  const extraInsights = result.interpretation ?? [];
  const testConditions = dcBiasMeta?.testConditions;
  const kneePoint = dcBiasMeta?.kneePoint;
  const dcBiasSummary = useMemo(() => {
    if (!dcBiasMeta || !dropPoint) return null;
    const l0Value = dcBiasMeta.l0.value;
    const l0Unit = dcBiasMeta.l0.unit;
    const lRatio = 1 - dropPercent / 100;
    const targetInductance = l0Value * lRatio;
    const currentValue =
      dcBiasMeta.curvePoints?.length
        ? interpolateDropCurrent(dcBiasMeta.curvePoints, targetInductance)
        : dropPoint.current;
    const axisRange = resolveAxisCurrentRange(dcBiasMeta, result.recommendedMeasurementBand);
    const currentUnit = axisRange?.unit ?? "A";
    return {
      currentValue,
      currentUnit,
      l0Value,
      l0Unit,
      targetInductance,
      ratioText: formatNumber(lRatio, 2)
    };
  }, [dcBiasMeta, dropPoint, dropPercent, result.recommendedMeasurementBand]);
  const buttonLabels =
    locale === "zh"
      ? {
          copyJson: "複製 JSON",
          copySummary: "複製摘要",
          insert: "插入對話",
          jsonCopied: "已複製 JSON",
          summaryCopied: "已複製摘要",
          labelOnGraph: "標註到圖上",
          labeling: "標註中…",
          download: "下載",
          copyImage: "複製圖片",
          close: "關閉",
          collapse: "收合",
          expand: "展開",
          annotationPanel: "標註結果",
          annotateError: "無法產生標註，請確認圖檔可讀取"
        }
      : {
          copyJson: "Copy JSON",
          copySummary: "Copy Summary",
          insert: "Insert to Chat",
          jsonCopied: "JSON copied",
          summaryCopied: "Summary copied",
          labelOnGraph: "Label on Graph",
          labeling: "Labeling…",
          download: "Download",
          copyImage: "Copy image",
          close: "Close",
          collapse: "Collapse",
          expand: "Expand",
          annotationPanel: "Annotation",
          annotateError: "Unable to annotate image. Check source image access."
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
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2">
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
                className={`rounded-2xl border px-3 py-2 ${tone}`}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">
                  {resolveCardText(card.label, locale)}
                </div>
                <div className="mt-1 text-[13px] font-semibold leading-snug">
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
              {locale === "zh"
                ? isDcBias
                  ? "摘要"
                  : "實用建議摘要"
                : isDcBias
                  ? "Summary"
                  : "Practical Summary"}
            </div>
            <p className="mt-2 text-slate-800 dark:text-slate-100">{interpretationText}</p>
          </div>
        )}

        {extraInsights.length > 0 && (
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {locale === "zh" ? "深入推論" : "Additional Inferences"}
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-800 dark:text-slate-100">
              {extraInsights.map((item, index) => (
                <li key={`${item}-${index}`} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {isDcBias && (testConditions || kneePoint) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {testConditions && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {locale === "zh" ? "測試條件" : "Testing conditions"}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {testConditions.acLevel && (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    {locale === "zh" ? `AC 電平 ${testConditions.acLevel}` : `AC test level ${testConditions.acLevel}`}
                  </span>
                )}
                {testConditions.sweep && (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    {locale === "zh" ? `掃描 ${testConditions.sweep}` : `Sweep ${testConditions.sweep}`}
                  </span>
                )}
                {testConditions.frequency && (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    {locale === "zh" ? `頻率 ${testConditions.frequency}` : `Frequency ${testConditions.frequency}`}
                  </span>
                )}
              </div>
            </div>
          )}
          {kneePoint && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {locale === "zh" ? "Knee 電流" : "Knee current"}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {formatNumber(kneePoint.current, 2)} {dcBiasMeta?.axisRange?.current.unit ?? "A"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {locale === "zh" ? "L 值" : "L value"} {formatNumber(kneePoint.inductance, 2)} {dcBiasMeta?.l0.unit ?? "µH"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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
