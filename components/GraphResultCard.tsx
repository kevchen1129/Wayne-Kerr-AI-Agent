"use client";

import { useMemo, useState } from "react";
import { GraphResult } from "@/lib/types";
import { cx } from "@/lib/utils";

type GraphResultCardProps = {
  result: GraphResult;
  onInsertSummary: (summary: string) => void;
};

type SectionKey = "features" | "interpretation" | "next_tests" | "equivalent";

function buildSummary(result: GraphResult): string {
  const parts: string[] = [result.graphTypeGuess];
  if (result.resonanceFrequency) parts.push(`共振頻率 ${result.resonanceFrequency}`);
  if (result.saturationCurrent) parts.push(`飽和電流 ${result.saturationCurrent}`);
  parts.push(
    ...result.detectedFeatures.map((f) => `${f.feature}${f.frequency ? ` @ ${f.frequency}` : ""}`),
    `Recommended band: ${result.recommendedMeasurementBand}`
  );
  return parts.join(". ");
}

export function GraphResultCard({ result, onInsertSummary }: GraphResultCardProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("features");
  const [copied, setCopied] = useState<"json" | "summary" | null>(null);

  const summary = useMemo(() => buildSummary(result), [result]);

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

  const sections: { key: SectionKey; label: string }[] = [
    { key: "features", label: "Detected Features" },
    { key: "interpretation", label: "Interpretation" },
    { key: "next_tests", label: "Next Tests" },
    { key: "equivalent", label: "Equivalent Circuit" }
  ];

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-glow backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Sweep Interpretation
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {result.graphTypeGuess}
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
                共振頻率 · Resonance frequency
              </div>
              <div className="mt-1 font-semibold text-violet-900 dark:text-violet-100">
                {result.resonanceFrequency}
              </div>
            </div>
          )}
          {result.saturationCurrent && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-2.5 dark:border-amber-600/40 dark:bg-amber-900/20">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                飽和電流 · Saturation current
              </div>
              <div className="mt-1 font-semibold text-amber-900 dark:text-amber-100">
                {result.saturationCurrent}
              </div>
            </div>
          )}
        </div>
      )}

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
        {activeSection === "features" && (
          <ul className="space-y-2">
            {result.detectedFeatures.map((f, i) => (
              <li
                key={i}
                className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {f.feature}
                  {f.frequency ? ` @ ${f.frequency}` : ""}
                </span>
                {f.notes && (
                  <span className="ml-2 text-slate-600 dark:text-slate-300">{f.notes}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {activeSection === "interpretation" && (
          <div className="space-y-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Recommended measurement band
              </div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {result.recommendedMeasurementBand}
              </div>
            </div>
            <ul className="list-disc space-y-1 pl-4">
              {result.interpretation.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {activeSection === "next_tests" && (
          <ul className="space-y-2">
            {result.recommendedNextTests.map((t, i) => (
              <li
                key={i}
                className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">{t.action}</div>
                <div className="mt-1 text-slate-600 dark:text-slate-300">{t.why}</div>
              </li>
            ))}
          </ul>
        )}

        {activeSection === "equivalent" && result.suggestedEquivalentCircuit && (
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              等效電路 · Equivalent circuit
            </div>
            <p className="mt-2 text-slate-800 dark:text-slate-100">
              {result.suggestedEquivalentCircuit}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleCopy("json")}
          className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {copied === "json" ? "JSON copied" : "Copy JSON"}
        </button>
        <button
          type="button"
          onClick={() => handleCopy("summary")}
          className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {copied === "summary" ? "Summary copied" : "Copy Summary"}
        </button>
        <button
          type="button"
          onClick={() => onInsertSummary(summary)}
          className="rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
        >
          Insert to Chat
        </button>
      </div>
    </div>
  );
}
