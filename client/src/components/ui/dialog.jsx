import a, { forwardRef as n } from "react";
import * as o from "@radix-ui/react-dialog";
import { X as N } from "lucide-react";
import { cn as l } from "@/lib/utils";
import { useTranslation as x } from "react-i18next";

const y = o.Root;
const v = o.Trigger;
const d = o.Portal;
const b = o.Close;

const r = n((t, e) => {
  const { className: s, ...i } = t;
  return a.createElement(o.Overlay, {
    ref: e,
    className: l(
      "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      s
    ),
    ...i,
  });
});
r.displayName = "DialogOverlay";

const m = n((t, e) => {
  const { className: s, children: i, ...u } = t;
  const { t: D } = x();
  return a.createElement(
    d,
    null,
    a.createElement(r, null),
    a.createElement(
      o.Content,
      {
        ref: e,
        className: l(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 mhub-premium-surface border border-[var(--chip-border)] p-6 text-[var(--text)] shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl",
          s
        ),
        ...u,
      },
      i,
      a.createElement(
        o.Close,
        {
          className:
            "absolute right-4 top-4 rounded-full bg-[var(--surface-2)]/60 p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-strong)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:pointer-events-none",
        },
        a.createElement(N, { className: "h-4 w-4" }),
        a.createElement("span", { className: "sr-only" }, D("close_dialog"))
      )
    )
  );
});
m.displayName = "DialogContent";

const c = ({ className: t, ...e }) =>
  a.createElement("div", {
    className: l(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      t
    ),
    ...e,
  });
c.displayName = "DialogHeader";

const g = ({ className: t, ...e }) =>
  a.createElement("div", {
    className: l(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      t
    ),
    ...e,
  });
g.displayName = "DialogFooter";

const f = n((t, e) => {
  const { className: s, ...i } = t;
  return a.createElement(o.Title, {
    ref: e,
    className: l(
      "text-lg font-semibold leading-none tracking-tight text-[var(--text-strong)]",
      s
    ),
    ...i,
  });
});
f.displayName = "DialogTitle";

const p = n((t, e) => {
  const { className: s, ...i } = t;
  return a.createElement(o.Description, {
    ref: e,
    className: l("text-sm text-[var(--text-muted)]", s),
    ...i,
  });
});
p.displayName = "DialogDescription";

export {
  y as Dialog,
  b as DialogClose,
  m as DialogContent,
  p as DialogDescription,
  g as DialogFooter,
  c as DialogHeader,
  r as DialogOverlay,
  d as DialogPortal,
  f as DialogTitle,
  v as DialogTrigger,
};
