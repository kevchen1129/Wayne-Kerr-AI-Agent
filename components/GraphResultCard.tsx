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
  const [annotatedImage, setAnnotatedImage] = useState<string | null>(null);
  const [annotating, setAnnotating] = useState(false);
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const [annotationOpen, setAnnotationOpen] = useState(true);
  const isDcBias =
    result.graphTypeGuess.toLowerCase().includes("dc bias") ||
    (Boolean(result.saturationCurrent) && !result.resonanceFrequency);
  const summaryCards = result.summaryCards ?? [];
  const dcBiasMeta = result.dcBiasMeta;
  const dropPoint = dcBiasMeta?.dropPoints.find((point) => point.percent === dropPercent);
  const interpretationText = resolveText(result.summaryText, locale) || "";
  const dropHeader =
    locale === "zh" ? "下降 20% (L = 0.8 * L0)" : "-20% (L = 0.8 * L0)";
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

  const handleCopyImage = async () => {
    if (!annotatedImage) return;
    try {
      if ("clipboard" in navigator && "write" in navigator.clipboard) {
        const blob = await (await fetch(annotatedImage)).blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(annotatedImage);
      }
    } catch (error) {
      console.error("Copy image failed", error);
    }
  };

  const handleDownloadImage = () => {
    if (!annotatedImage) return;
    const link = document.createElement("a");
    link.href = annotatedImage;
    link.download = "dc-bias-annotated.png";
    link.click();
  };

  const handleLabelGraph = async () => {
    if (!result.sourceImageUrl || !dcBiasMeta || !dropPoint) {
      setAnnotationError(buttonLabels.annotateError);
      return;
    }
    setAnnotating(true);
    setAnnotationError(null);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = result.sourceImageUrl!;
      });

      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");
      ctx.drawImage(image, 0, 0, width, height);

      const plotArea = dcBiasMeta.plotAreaPct
        ? {
            left: width * dcBiasMeta.plotAreaPct.left,
            top: height * dcBiasMeta.plotAreaPct.top,
            right: width * dcBiasMeta.plotAreaPct.right,
            bottom: height * dcBiasMeta.plotAreaPct.bottom
          }
        : {
            left: width * 0.12,
            right: width * 0.08,
            top: height * 0.12,
            bottom: height * 0.14
          };
      const plotWidth = plotArea.right - plotArea.left;
      const plotHeight = plotArea.bottom - plotArea.top;

      const axisCurrentRange = resolveAxisCurrentRange(dcBiasMeta, result.recommendedMeasurementBand)!;

      const minCurrent = axisCurrentRange.min;
      const maxCurrent =
        axisCurrentRange.max === axisCurrentRange.min ? axisCurrentRange.min + 1 : axisCurrentRange.max;
      const lRatio = 1 - dropPercent / 100;
      const l0Value = dcBiasMeta.l0.value;
      const targetInductance = l0Value * lRatio;
      const curveCurrent =
        dcBiasMeta.curvePoints?.length
          ? interpolateDropCurrent(dcBiasMeta.curvePoints, targetInductance)
          : null;
      const currentValue = curveCurrent ?? dropPoint.current;
      if (!Number.isFinite(currentValue)) {
        throw new Error("No current value");
      }
      const currentRatio = (currentValue - minCurrent) / (maxCurrent - minCurrent);
      const x = plotArea.left + clampValue(currentRatio, 0, 1) * plotWidth;

      const yValue = targetInductance;
      const axisL =
        dcBiasMeta.axisRange?.inductance ?? { min: l0Value * 0.6, max: l0Value * 1.05, unit: dcBiasMeta.l0.unit };
      const lMin = axisL.min;
      const lMax = axisL.max === axisL.min ? axisL.min + 1 : axisL.max;
      const lRatioScaled = (lMax - yValue) / (lMax - lMin);
      const y = plotArea.top + clampValue(lRatioScaled, 0, 1) * plotHeight;

      const lineWidth = Math.max(2, width * 0.004);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = "#22c55e";
      ctx.beginPath();
      ctx.moveTo(x, plotArea.top);
      ctx.lineTo(x, plotArea.bottom);
      ctx.stroke();

      ctx.strokeStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(plotArea.left, y);
      ctx.lineTo(plotArea.right, y);
      ctx.stroke();

      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath();
      ctx.arc(x, y, Math.max(4, width * 0.008), 0, Math.PI * 2);
      ctx.fill();

      const fontSize = Math.max(12, Math.round(width * 0.02));
      ctx.font = `${fontSize}px "Open Sans", system-ui, sans-serif`;
      ctx.textBaseline = "top";

      const labelCurrent =
        locale === "zh"
          ? `飽和點 I@-${dropPercent}% = ${formatNumber(currentValue, 2)} ${axisCurrentRange.unit}`
          : `I@-${dropPercent}% = ${formatNumber(currentValue, 2)} ${axisCurrentRange.unit}`;
      const l0Unit = dcBiasMeta.l0.unit;
      const lValue = yValue;
      const ratioText = formatNumber(lRatio, 2);
      const labelL0 =
        locale === "zh"
          ? `0.8*L0 = ${formatNumber(lValue, 2)} ${l0Unit}`
          : `${ratioText}*L0 = ${formatNumber(lValue, 2)} ${l0Unit}`;

      const drawLabel = (text: string, xPos: number, yPos: number) => {
        const paddingX = 10;
        const paddingY = 6;
        const metrics = ctx.measureText(text);
        const boxWidth = metrics.width + paddingX * 2;
        const boxHeight = fontSize + paddingY * 2;
        const safeX = clampValue(xPos, 12, width - boxWidth - 12);
        const safeY = clampValue(yPos, 12, height - boxHeight - 12);
        ctx.fillStyle = "rgba(15,23,42,0.8)";
        ctx.fillRect(safeX, safeY, boxWidth, boxHeight);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, safeX + paddingX, safeY + paddingY);
      };

      drawLabel(labelCurrent, x + 16, plotArea.top + 8);
      drawLabel(labelL0, plotArea.left + 12, y - fontSize - 16);

      const dataUrl = canvas.toDataURL("image/png");
      setAnnotatedImage(dataUrl);
      setAnnotationOpen(true);
    } catch (error) {
      console.error("Annotate failed", error);
      setAnnotationError(buttonLabels.annotateError);
    } finally {
      setAnnotating(false);
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
              {locale === "zh" ? "摘要" : "Summary"}
            </div>
            <p className="mt-2 text-slate-800 dark:text-slate-100">{interpretationText}</p>
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

      {isDcBias && (
        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {dropHeader}
            </div>
            <button
              type="button"
              onClick={handleLabelGraph}
              disabled={!result.sourceImageUrl || !dcBiasMeta || !dropPoint || annotating}
              className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            >
              {annotating ? buttonLabels.labeling : buttonLabels.labelOnGraph}
            </button>
          </div>
          {annotationError && (
            <div className="mt-3 text-xs text-rose-500">{annotationError}</div>
          )}
          {annotatedImage && (
            <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setAnnotationOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                aria-expanded={annotationOpen}
              >
                <span>{buttonLabels.annotationPanel}</span>
                <span className="flex items-center gap-2">
                  {annotationOpen ? buttonLabels.collapse : buttonLabels.expand}
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 transition ${annotationOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              {annotationOpen && (
                <div className="mt-3">
                  {dcBiasSummary && (
                    <div className="mb-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {locale === "zh" ? "標註摘要" : "Annotation Summary"}
                      </div>
                      <div className="mt-2 space-y-1">
                        <div>
                          {locale === "zh"
                            ? `I@-20% = ${formatNumber(
                                dcBiasSummary.currentValue ?? dropPoint?.current ?? Number.NaN,
                                2
                              )} ${dcBiasSummary.currentUnit}`
                            : `I@-20% = ${formatNumber(
                                dcBiasSummary.currentValue ?? dropPoint?.current ?? Number.NaN,
                                2
                              )} ${dcBiasSummary.currentUnit}`}
                        </div>
                        <div>
                          {locale === "zh"
                            ? `0.8*L0 = ${formatNumber(dcBiasSummary.targetInductance, 2)} ${dcBiasSummary.l0Unit}`
                            : `0.8*L0 = ${formatNumber(dcBiasSummary.targetInductance, 2)} ${dcBiasSummary.l0Unit}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          {locale === "zh"
                            ? `L0 參考 = ${formatNumber(dcBiasSummary.l0Value, 2)} ${dcBiasSummary.l0Unit}`
                            : `L0 reference = ${formatNumber(dcBiasSummary.l0Value, 2)} ${dcBiasSummary.l0Unit}`}
                        </div>
                      </div>
                    </div>
                  )}
                  <img
                    src={annotatedImage}
                    alt="Annotated DC bias"
                    className="w-full rounded-xl"
                  />
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      className="rounded-2xl border border-slate-200/80 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {buttonLabels.download}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyImage}
                      className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    >
                      {buttonLabels.copyImage}
                    </button>
                  </div>
                </div>
              )}
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
