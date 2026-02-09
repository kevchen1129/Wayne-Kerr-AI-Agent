"use client";

import { useMemo, useState } from "react";
import { DUTResult, LocalizedString } from "@/lib/types";
import { cx } from "@/lib/utils";

type DUTResultCardProps = {
  result: DUTResult;
  onInsertSummary: (summary: string) => void;
  locale: "zh" | "en";
};

type SectionKey = "working_range" | "setup" | "confirm" | "warnings";

const resolveText = (value: LocalizedString | undefined, locale: "zh" | "en") => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[locale] ?? value.en ?? value.zh ?? "";
};

const COMPONENT_LABEL: Record<DUTResult["componentType"], { zh: string; en: string }> = {
  Inductor: { zh: "電感", en: "Inductor" },
  Capacitor: { zh: "電容", en: "Capacitor" },
  Resistor: { zh: "電阻", en: "Resistor" },
  Unknown: { zh: "未知", en: "Unknown" }
};

const MODE_LABEL: Record<DUTResult["recommendedSetup"]["mode"], { zh: string; en: string }> = {
  Series: { zh: "串聯", en: "Series" },
  Parallel: { zh: "並聯", en: "Parallel" }
};

function buildSummary(result: DUTResult, locale: "zh" | "en"): string {
  const band = resolveText(result.estimatedWorkingRange?.recommendedFrequencyBand, locale) || "—";
  const mode = MODE_LABEL[result.recommendedSetup.mode][locale];
  const params = result.recommendedSetup.primaryParams
    .slice(0, 2)
    .map((item) => resolveText(item, locale))
    .filter(Boolean)
    .join(", ");
  const componentLabel = COMPONENT_LABEL[result.componentType][locale];
  const packageGuess = resolveText(result.packageGuess, locale);
  const base = packageGuess ? `${componentLabel} (${packageGuess})` : componentLabel;
  const label =
    locale === "zh"
      ? `建議頻段：${band}。模式：${mode}。主要參數：${params}。`
      : `Recommended band: ${band}. Mode: ${mode}. Primary: ${params}.`;
  return `${base}. ${label}`;
}

export function DUTResultCard({ result, onInsertSummary, locale }: DUTResultCardProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("working_range");
  const [copied, setCopied] = useState<"json" | "summary" | null>(null);

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

  const sections: { key: SectionKey; label: string }[] =
    locale === "zh"
      ? [
          { key: "working_range", label: "工作範圍" },
          { key: "setup", label: "建議設定" },
          { key: "confirm", label: "待確認" },
          { key: "warnings", label: "警示" }
        ]
      : [
          { key: "working_range", label: "Working Range" },
          { key: "setup", label: "Recommended Setup" },
          { key: "confirm", label: "What to Confirm" },
          { key: "warnings", label: "Warnings" }
        ];

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-glow backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {locale === "zh" ? "辨識元件" : "Identified Component"}
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {COMPONENT_LABEL[result.componentType][locale]}
            {result.packageGuess && (
              <span className="ml-2 text-sm font-normal text-slate-600 dark:text-slate-300">
                — {resolveText(result.packageGuess, locale)}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
          {Math.round(result.confidence * 100)}% {locale === "zh" ? "信心度" : "confidence"}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sections.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={cx(
              "rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))]",
              activeSection === key
                ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
        {activeSection === "working_range" && result.estimatedWorkingRange && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {locale === "zh" ? "建議頻段" : "Recommended frequency band"}
              </div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {resolveText(result.estimatedWorkingRange.recommendedFrequencyBand, locale)}
              </div>
            </div>
            {result.estimatedWorkingRange.srFEstimate && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "zh" ? "自共振推估" : "Self-resonance estimate"}
                </div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {resolveText(result.estimatedWorkingRange.srFEstimate, locale)}
                </div>
              </div>
            )}
            {result.estimatedWorkingRange.notes && (
              <p className="text-slate-600 dark:text-slate-300">
                {resolveText(result.estimatedWorkingRange.notes, locale)}
              </p>
            )}
          </div>
        )}

        {activeSection === "setup" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {locale === "zh" ? "模式與參數" : "Mode & params"}
              </div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {MODE_LABEL[result.recommendedSetup.mode][locale]} —{" "}
                {result.recommendedSetup.primaryParams
                  .map((item) => resolveText(item, locale))
                  .filter(Boolean)
                  .join(", ")}
              </div>
            </div>
            {result.recommendedSetup.testFrequencySuggestions.length > 0 && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "zh" ? "頻率建議" : "Test frequency suggestions"}
                </div>
                <ul className="mt-2 space-y-1">
                  {result.recommendedSetup.testFrequencySuggestions.map((s, i) => (
                    <li key={i}>
                      <span className="font-medium">{resolveText(s.label, locale)}:</span>{" "}
                      {resolveText(s.value, locale)}
                      {s.rationale && (
                        <span className="ml-1 text-slate-500 dark:text-slate-400">
                          ({resolveText(s.rationale, locale)})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.recommendedSetup.testLevel && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "zh" ? "測試電平" : "Test level"}
                </div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {resolveText(result.recommendedSetup.testLevel, locale)}
                </div>
              </div>
            )}
            {result.recommendedSetup.dcBias && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">DC bias</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {resolveText(result.recommendedSetup.dcBias, locale)}
                </div>
              </div>
            )}
            {result.recommendedSetup.fixture && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "zh" ? "治具" : "Fixture"}
                </div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {resolveText(result.recommendedSetup.fixture, locale)}
                </div>
              </div>
            )}
            {result.recommendedSetup.compensation && result.recommendedSetup.compensation.length > 0 && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {locale === "zh" ? "補償" : "Compensation"}
                </div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {result.recommendedSetup.compensation
                    .map((item) => resolveText(item, locale))
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === "confirm" && (
          <ul className="space-y-2">
            {result.whatToConfirm.map((q, i) => (
              <li
                key={i}
                className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                {resolveText(q, locale)}
              </li>
            ))}
          </ul>
        )}

        {activeSection === "warnings" && result.warnings && result.warnings.length > 0 && (
          <ul className="space-y-2">
            {result.warnings.map((w, i) => (
              <li
                key={i}
                className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-3 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-200"
              >
                {resolveText(w, locale)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleCopy("json")}
          className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {copied === "json"
            ? locale === "zh"
              ? "已複製 JSON"
              : "JSON copied"
            : locale === "zh"
              ? "複製 JSON"
              : "Copy JSON"}
        </button>
        <button
          type="button"
          onClick={() => handleCopy("summary")}
          className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {copied === "summary"
            ? locale === "zh"
              ? "已複製摘要"
              : "Summary copied"
            : locale === "zh"
              ? "複製摘要"
              : "Copy Summary"}
        </button>
        <button
          type="button"
          onClick={() => onInsertSummary(summary)}
          className="rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
        >
          {locale === "zh" ? "插入對話" : "Insert Setup to Chat"}
        </button>
      </div>
    </div>
  );
}
