import React from "react";

/**
 * Universal page skeleton — shows stat cards + list placeholders.
 * Variants: "list" (default), "dashboard", "form", "detail"
 */
export default function PageSkeleton({ variant = "list", count = 4 }) {
  if (variant === "dashboard") {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-700/40" />
          ))}
        </div>
        <div className="h-48 rounded-2xl bg-slate-200/60 dark:bg-slate-700/40" />
        <div className="space-y-3">
          <div className="h-5 w-32 rounded bg-slate-200/60 dark:bg-slate-700/40" />
          <div className="h-16 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
          <div className="h-16 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="animate-pulse space-y-5 p-4">
        <div className="h-6 w-48 rounded bg-slate-200/60 dark:bg-slate-700/40" />
        <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
        <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
        <div className="h-32 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
        <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
        <div className="h-12 w-full rounded-xl bg-primary/20" />
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 w-full rounded-b-2xl bg-slate-200/60 dark:bg-slate-700/40" />
        <div className="px-4 space-y-3">
          <div className="h-7 w-3/4 rounded bg-slate-200/60 dark:bg-slate-700/40" />
          <div className="h-5 w-1/2 rounded bg-slate-200/60 dark:bg-slate-700/40" />
          <div className="h-4 w-full rounded bg-slate-200/60 dark:bg-slate-700/40" />
          <div className="h-4 w-5/6 rounded bg-slate-200/60 dark:bg-slate-700/40" />
          <div className="h-20 rounded-xl bg-slate-200/60 dark:bg-slate-700/40 mt-4" />
          <div className="h-32 rounded-xl bg-slate-200/60 dark:bg-slate-700/40" />
        </div>
      </div>
    );
  }

  // Default: list variant
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="h-5 w-32 rounded bg-slate-200/60 dark:bg-slate-700/40 mb-4" />
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40">
          <div className="w-20 h-20 rounded-xl bg-slate-200/60 dark:bg-slate-700/40 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-3/4 rounded bg-slate-200/60 dark:bg-slate-700/40" />
            <div className="h-3 w-1/2 rounded bg-slate-200/60 dark:bg-slate-700/40" />
            <div className="h-4 w-20 rounded bg-slate-200/60 dark:bg-slate-700/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
