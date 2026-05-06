import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Loader2, Lock, SearchX, ShieldCheck } from "lucide-react";

/**
 * A loading-state card with a spinner, title, and description.
 * @param {object} props
 * @param {string} [props.title="Loading..."]
 * @param {string} [props.description="Please wait while we load this page."]
 * @param {string} [props.className=""]
 * @param {string} [props.marker="loading"]
 */
const PageLoadingState = ({
  title = "Loading...",
  description = "Please wait while we load this page.",
  className = "",
  marker = "loading",
}) =>
  React.createElement(
    Card,
    { className: `mhub-state-card ${className}`.trim(), "data-ux-state": marker },
    React.createElement(
      CardContent,
      { className: "py-12 px-6 text-center", role: "status", "aria-live": "polite" },
      React.createElement(
        "div",
        {
          className:
            "w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-900/30 dark:text-blue-300",
        },
        React.createElement(Loader2, {
          className: "w-6 h-6 animate-spin",
        }),
      ),
      React.createElement(
        "p",
        { className: "font-semibold text-gray-800 dark:text-gray-100 text-lg" },
        title
      ),
      React.createElement(
        "p",
        { className: "text-sm text-gray-500 dark:text-gray-400 mt-1" },
        description
      )
    )
  );

/**
 * An error-state card with an alert icon, retry button, and optional secondary action.
 * @param {object} props
 * @param {string} [props.title="Something went wrong"]
 * @param {string} [props.description="Please try again."]
 * @param {Function} [props.onRetry]
 * @param {string} [props.retryLabel="Retry"]
 * @param {React.ReactNode} [props.secondaryAction]
 * @param {string} [props.className=""]
 * @param {string} [props.marker="error"]
 */
const PageErrorState = ({
  title = "Something went wrong",
  description = "Please try again.",
  onRetry,
  retryLabel = "Retry",
  secondaryAction,
  className = "",
  marker = "error",
}) =>
  React.createElement(
    Card,
    { className: `mhub-state-card ${className}`.trim(), "data-ux-state": marker },
    React.createElement(
      CardContent,
      { className: "py-10 px-6 text-center", role: "alert", "aria-live": "assertive" },
      React.createElement(
        "div",
        {
          className:
            "w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-red-50 text-red-500 shadow-lg dark:bg-red-900/30 dark:text-red-300",
        },
        React.createElement(AlertTriangle, {
          className: "w-8 h-8",
        }),
      ),
      React.createElement(
        "h3",
        { className: "font-bold text-red-800 dark:text-red-200 text-lg" },
        title
      ),
      React.createElement(
        "p",
        { className: "text-sm text-red-600/80 dark:text-red-400 mt-1.5 mb-5 max-w-xs mx-auto" },
        description
      ),
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row gap-3 justify-center" },
        onRetry &&
          React.createElement(
            Button,
            {
              "data-ux-action": "state_retry",
              onClick: onRetry,
              variant: "destructive",
            },
            retryLabel
          ),
        secondaryAction
      )
    )
  );

/**
 * An empty-state card with a customisable icon, message, and optional action slot.
 * @param {object} props
 * @param {string} [props.title="Nothing here yet"]
 * @param {string} [props.description="Try a different action."]
 * @param {React.ComponentType} [props.icon=SearchX]
 * @param {React.ReactNode} [props.action]
 * @param {string} [props.className=""]
 * @param {string} [props.marker="empty"]
 */
const PageEmptyState = ({
  title = "Nothing here yet",
  description = "Try a different action.",
  icon: Icon = SearchX,
  action,
  className = "",
  marker = "empty",
}) =>
  React.createElement(
    Card,
    { className: `mhub-state-card ${className}`.trim(), "data-ux-state": marker },
    React.createElement(
      CardContent,
      { className: "py-12 px-6 text-center", role: "status", "aria-live": "polite" },
      React.createElement(
        "div",
        {
          className:
            "w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-500 shadow-sm dark:bg-slate-800/60 dark:text-slate-300",
        },
        React.createElement(Icon, {
          className: "w-6 h-6",
        }),
      ),
      React.createElement(
        "p",
        { className: "font-semibold text-gray-800 dark:text-gray-100 text-lg" },
        title
      ),
      React.createElement(
        "p",
        { className: "text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5" },
        description
      ),
      action
    )
  );

/**
 * An authentication-gate card prompting the user to log in, with primary and secondary action slots.
 * @param {object} props
 * @param {string} [props.title="Login required"]
 * @param {string} [props.description="Please log in to continue."]
 * @param {React.ReactNode} [props.primaryAction]
 * @param {React.ReactNode} [props.secondaryAction]
 * @param {string} [props.className=""]
 * @param {string} [props.marker="auth-gate"]
 */
const PageAuthGateState = ({
  title = "Login required",
  description = "Please log in to continue.",
  primaryAction,
  secondaryAction,
  badge,
  highlights = [],
  tone = "default",
  icon: IconProp,
  benefits = [],
  className = "",
  marker = "auth-gate",
}) => {
  const tonePalette = {
    default: {
      badge:
        "border-blue-200/70 bg-blue-50/80 text-blue-700 dark:border-blue-400/30 dark:bg-blue-900/30 dark:text-blue-200",
      iconWrap:
        "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
      title: "text-gray-800 dark:text-gray-100",
      description: "text-gray-500 dark:text-gray-400",
      highlight:
        "border-slate-200/70 bg-slate-50/90 text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200",
    },
    rewards: {
      badge:
        "border-fuchsia-200/70 bg-fuchsia-50/80 text-fuchsia-700 dark:border-fuchsia-400/30 dark:bg-fuchsia-900/30 dark:text-fuchsia-200",
      iconWrap:
        "bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
      title: "text-fuchsia-900 dark:text-fuchsia-100",
      description: "text-fuchsia-700/80 dark:text-fuchsia-200/80",
      highlight:
        "border-fuchsia-200/70 bg-fuchsia-50/80 text-fuchsia-700 dark:border-fuchsia-500/40 dark:bg-fuchsia-900/30 dark:text-fuchsia-200",
    },
    profile: {
      badge:
        "border-cyan-200/80 bg-cyan-50/90 text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-900/30 dark:text-cyan-200",
      iconWrap:
        "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-200",
      title: "text-cyan-900 dark:text-cyan-100",
      description: "text-slate-600 dark:text-cyan-100/80",
      highlight:
        "border-cyan-200/80 bg-cyan-50/80 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-900/30 dark:text-cyan-200",
    },
    notifications: {
      badge:
        "border-sky-200/80 bg-sky-50/90 text-sky-800 dark:border-sky-400/30 dark:bg-sky-900/30 dark:text-sky-200",
      iconWrap:
        "bg-sky-50 text-sky-700 dark:bg-sky-900/35 dark:text-sky-200",
      title: "text-sky-900 dark:text-sky-100",
      description: "text-slate-600 dark:text-sky-100/80",
      highlight:
        "border-sky-200/80 bg-sky-50/85 text-sky-800 dark:border-sky-500/40 dark:bg-sky-900/30 dark:text-sky-200",
    },
    wishlist: {
      badge:
        "border-rose-200/80 bg-rose-50/90 text-rose-700 dark:border-rose-400/30 dark:bg-rose-900/30 dark:text-rose-200",
      iconWrap:
        "bg-rose-50 text-rose-700 dark:bg-rose-900/35 dark:text-rose-200",
      title: "text-rose-900 dark:text-rose-100",
      description: "text-slate-600 dark:text-rose-100/80",
      highlight:
        "border-rose-200/80 bg-rose-50/85 text-rose-700 dark:border-rose-500/40 dark:bg-rose-900/30 dark:text-rose-200",
    },
  };
  const resolvedTone = tonePalette[tone] || tonePalette.default;
  const ResolvedIcon = IconProp || Lock;
  return React.createElement(
    Card,
    { className: `mhub-state-card ${className}`.trim(), "data-ux-state": marker },
    React.createElement(
      CardContent,
      { className: "py-8 px-6 text-center", role: "status", "aria-live": "polite" },
      // Large illustration circle
      React.createElement(
        "div",
        { className: "mb-5 flex justify-center" },
        React.createElement(
          "div",
          {
            className:
              `relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${resolvedTone.iconWrap}`,
          },
          React.createElement(ResolvedIcon, { className: "w-9 h-9" }),
          React.createElement(
            "div",
            {
              className:
                "absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-700",
            },
            React.createElement(ShieldCheck, {
              className: "w-4 h-4 text-emerald-500",
            }),
          ),
        ),
      ),
      badge
        ? React.createElement(
            "div",
            { className: "mb-3 flex justify-center" },
            React.createElement(
              "span",
              {
                className:
                  `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] shadow-sm ${resolvedTone.badge}`,
              },
              badge,
            ),
          )
        : null,
      React.createElement(
        "h2",
        { className: `font-bold text-xl leading-tight ${resolvedTone.title}` },
        title
      ),
      React.createElement(
        "p",
        { className: `text-sm mt-2 mb-4 max-w-xs mx-auto ${resolvedTone.description}` },
        description
      ),
      Array.isArray(highlights) && highlights.length
        ? React.createElement(
            "div",
            { className: "mb-5 flex flex-wrap justify-center gap-2" },
            highlights.map((item, index) =>
              React.createElement(
                "span",
                {
                  key: `${item}-${index}`,
                  className:
                    `inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${resolvedTone.highlight}`,
                },
                item,
              ),
            ),
          )
        : null,
      // Benefit preview cards (fill dead whitespace)
      Array.isArray(benefits) && benefits.length
        ? React.createElement(
            "div",
            { className: "mb-5 grid grid-cols-2 gap-2 text-left" },
            benefits.map((b, i) =>
              React.createElement(
                "div",
                {
                  key: i,
                  className:
                    "rounded-xl border border-slate-200/70 bg-slate-50/80 dark:border-slate-700/50 dark:bg-slate-800/50 p-3",
                },
                React.createElement(
                  "p",
                  { className: "text-xs font-semibold text-slate-700 dark:text-slate-200" },
                  b.label
                ),
                React.createElement(
                  "p",
                  { className: "text-[11px] text-slate-500 dark:text-slate-400 mt-0.5" },
                  b.hint
                ),
              ),
            ),
          )
        : null,
      React.createElement(
        "div",
        { className: "flex flex-col sm:flex-row gap-3 justify-center" },
        primaryAction,
        secondaryAction
      )
    )
  );
};

export { PageAuthGateState, PageEmptyState, PageErrorState, PageLoadingState };
