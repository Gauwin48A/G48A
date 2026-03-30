import * as e from "react";
import { cn as a } from "@/lib/utils";

const r = e.forwardRef(({ className: o, ...i }, t) =>
  e.createElement("textarea", {
    className: a(
      "mhub-input flex min-h-[96px] w-full rounded-xl px-3.5 py-2 text-sm ring-offset-background placeholder:text-[var(--text-faint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
      o
    ),
    ref: t,
    ...i,
  })
);
r.displayName = "Textarea";

export { r as Textarea };
