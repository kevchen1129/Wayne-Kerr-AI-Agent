"use client";

import { useMemo, useState } from "react";
import { DUTResult } from "@/lib/types";
import { cx } from "@/lib/utils";

type DUTResultCardProps = {
  result: DUTResult;
  onInsertSummary: (summary: string) => void;
};

type SectionKey = "working_range" | "setup" | "confirm" | "warnings";

function buildSummary(result: DUTResult): string {
  const band = result.estimatedWorkingRange?.recommendedFrequencyBand ?? "—";
  const mode = result.recommendedSetup.mode;
  const params = result.recommendedSetup.primaryParams.slice(0, 2).join(", ");
  return `${result.componentType}${result.packageGuess ? ` (${result.packageGuess})` : ""}. Recommended band: ${band}. Mode: ${mode}. Primary: ${params}.`;
}

export function DUTResultCard({ result, onInsertSummary }: DUTResultCardProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("working_range");
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
            Identified Component
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {result.componentType}
            {result.packageGuess && (
              <span className="ml-2 text-sm font-normal text-slate-600 dark:text-slate-300">
                — {result.packageGuess}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
          {Math.round(result.confidence * 100)}% confidence
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
                Recommended frequency band
              </div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {result.estimatedWorkingRange.recommendedFrequencyBand}
              </div>
            </div>
            {result.estimatedWorkingRange.srFEstimate && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Self-resonance estimate
                </div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {result.estimatedWorkingRange.srFEstimate}
                </div>
              </div>
            )}
            {result.estimatedWorkingRange.notes && (
              <p className="text-slate-600 dark:text-slate-300">
                {result.estimatedWorkingRange.notes}
              </p>
            )}
          </div>
        )}

        {activeSection === "setup" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Mode & params</div>
              <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {result.recommendedSetup.mode} — {result.recommendedSetup.primaryParams.join(", ")}
              </div>
            </div>
            {result.recommendedSetup.testFrequencySuggestions.length > 0 && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Test frequency suggestions
                </div>
                <ul className="mt-2 space-y-1">
                  {result.recommendedSetup.testFrequencySuggestions.map((s, i) => (
                    <li key={i}>
                      <span className="font-medium">{s.label}:</span> {s.value}
                      {s.rationale && (
                        <span className="ml-1 text-slate-500 dark:text-slate-400">
                          ({s.rationale})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.recommendedSetup.testLevel && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Test level</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {result.recommendedSetup.testLevel}
                </div>
              </div>
            )}
            {result.recommendedSetup.dcBias && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">DC bias</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {result.recommendedSetup.dcBias}
                </div>
              </div>
            )}
            {result.recommendedSetup.fixture && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Fixture</div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {result.recommendedSetup.fixture}
                </div>
              </div>
            )}
            {result.recommendedSetup.compensation && result.recommendedSetup.compensation.length > 0 && (
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Compensation
                </div>
                <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {result.recommendedSetup.compensation.join(", ")}
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
                {q}
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
                {w}
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
          Insert Setup to Chat
        </button>
      </div>
    </div>
  );
}
