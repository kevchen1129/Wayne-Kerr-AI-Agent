"use client";

type ChatHeaderProps = {
  title: string;
  activeWorkflow: string;
  localeLabel: string;
  onOpenSidebar: () => void;
  onExport: () => void;
  onClear: () => void;
  onToggleLocale: () => void;
  labels: {
    activeThread: string;
    export: string;
    clear: string;
  };
};

export function ChatHeader({
  title,
  activeWorkflow,
  localeLabel,
  onOpenSidebar,
  onExport,
  onClear,
  onToggleLocale,
  labels
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-slate-200/70 bg-white/80 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 md:px-4 md:py-3">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/80 text-slate-600 transition hover:-translate-y-0.5 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:text-slate-200 md:hidden"
          aria-label="Open sidebar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="hidden text-xs uppercase tracking-[0.2em] text-slate-400 md:block">
            {labels.activeThread}
          </div>
          <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg">
            {title}
          </div>
        </div>
      </div>
      <div className="flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap sm:gap-2">
        <span className="hidden rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 md:inline-flex">
          {activeWorkflow}
        </span>
        <button
          type="button"
          onClick={onToggleLocale}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-2"
          aria-label="Switch language"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
            <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
          </svg>
          <span className="hidden sm:inline">{localeLabel}</span>
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-2"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 16V3" />
            <path d="M8 7l4-4 4 4" />
            <path d="M4 21h16" />
          </svg>
          <span className="hidden sm:inline">{labels.export}</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-2"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 14h10l1-14" />
          </svg>
          <span className="hidden sm:inline">{labels.clear}</span>
        </button>
      </div>
    </header>
  );
}
