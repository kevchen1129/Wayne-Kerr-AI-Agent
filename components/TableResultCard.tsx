"use client";

import { useMemo, useState } from "react";
import { TableResult } from "@/lib/types";
import { cx } from "@/lib/utils";

type TableResultCardProps = {
  result: TableResult;
  onInsertFormTemplate?: (template: string) => void;
};

function buildFormTemplate(result: TableResult): string {
  const header = result.extractedColumns.join("\t");
  const sample =
    result.sampleRows?.[0] &&
    result.extractedColumns.map((col) => result.sampleRows![0][col] ?? "").join("\t");
  return sample ? `${header}\n${sample}` : header;
}

export function TableResultCard({ result, onInsertFormTemplate }: TableResultCardProps) {
  const [copied, setCopied] = useState<"json" | "columns" | null>(null);

  const formTemplate = useMemo(() => buildFormTemplate(result), [result]);

  const handleCopy = async (type: "json" | "columns") => {
    const payload =
      type === "json" ? JSON.stringify(result, null, 2) : result.extractedColumns.join(", ");
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
            表格辨識 · Table Recognition
          </div>
          <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {result.tableTypeGuess}
          </div>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
          {Math.round(result.confidence * 100)}% confidence
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
          抽取欄位 · Extracted columns
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.extractedColumns.map((col) => (
            <span
              key={col}
              className="rounded-xl border border-slate-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {col}
            </span>
          ))}
        </div>
      </div>

      {result.suggestedFormFields.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            建議表單欄位 · Suggested form fields
          </div>
          <ul className="mt-2 space-y-1.5">
            {result.suggestedFormFields.map((f) => (
              <li
                key={f.name}
                className="rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/60"
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">{f.label}</span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">
                  ({f.type}
                  {f.unit ? `, ${f.unit}` : ""})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.sampleRows && result.sampleRows.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            範例列 · Sample row
          </div>
          <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <pre className="text-xs text-slate-700 dark:text-slate-200">
              {JSON.stringify(result.sampleRows[0], null, 2)}
            </pre>
          </div>
        </div>
      )}

      {result.notes && result.notes.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
          {result.notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      )}

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
          onClick={() => handleCopy("columns")}
          className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {copied === "columns" ? "Columns copied" : "Copy columns"}
        </button>
        {onInsertFormTemplate && (
          <button
            type="button"
            onClick={() => onInsertFormTemplate(formTemplate)}
            className="rounded-2xl border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
          >
            建立表單 / Insert form template
          </button>
        )}
      </div>
    </div>
  );
}
