import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Loader2, Lock, SearchX } from "lucide-react";

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
      { className: "py-12 px-6 text-center", role: "alert", "aria-live": "assertive" },
      React.createElement(
        "div",
        {
          className:
            "w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-red-50 text-red-600 shadow-sm dark:bg-red-900/30 dark:text-red-300",
        },
        React.createElement(AlertTriangle, {
          className: "w-6 h-6",
        }),
      ),
      React.createElement(
        "p",
        { className: "font-semibold text-red-800 dark:text-red-200 text-lg" },
        title
      ),
      React.createElement(
        "p",
        { className: "text-sm text-red-700 dark:text-red-400 mt-1 mb-5" },
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
  className = "",
  marker = "auth-gate",
}) =>
  React.createElement(
    Card,
    { className: `mhub-state-card ${className}`.trim(), "data-ux-state": marker },
    React.createElement(
      CardContent,
      { className: "py-12 px-6 text-center", role: "status", "aria-live": "polite" },
      badge
        ? React.createElement(
            "div",
            { className: "mb-4 flex justify-center" },
            React.createElement(
              "span",
              {
                className:
                  "inline-flex items-center rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700 shadow-sm dark:border-blue-400/30 dark:bg-blue-900/30 dark:text-blue-200",
              },
              badge,
            ),
          )
        : null,
      React.createElement(
        "div",
        {
          className:
            "w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-600 shadow-sm dark:bg-amber-900/30 dark:text-amber-300",
        },
        React.createElement(Lock, {
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
      Array.isArray(highlights) && highlights.length
        ? React.createElement(
            "div",
            { className: "mb-6 flex flex-wrap justify-center gap-2" },
            highlights.map((item, index) =>
              React.createElement(
                "span",
                {
                  key: `${item}-${index}`,
                  className:
                    "inline-flex items-center rounded-full border border-slate-200/70 bg-slate-50/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200",
                },
                item,
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

export { PageAuthGateState, PageEmptyState, PageErrorState, PageLoadingState };
