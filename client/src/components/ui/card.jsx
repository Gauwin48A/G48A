import * as r from "react";
import { cn as o } from "@/lib/utils";

const s = r.forwardRef(({ className: e, ...a }, d) =>
  r.createElement("div", {
    ref: d,
    className: o("mhub-card", e),
    ...a,
  })
);
s.displayName = "Card";

const t = r.forwardRef(({ className: e, ...a }, d) =>
  r.createElement("div", {
    ref: d,
    className: o("mhub-card-header", e),
    ...a,
  })
);
t.displayName = "CardHeader";

const f = r.forwardRef(({ className: e, ...a }, d) =>
  r.createElement("h3", {
    ref: d,
    className: o(
      "text-lg sm:text-xl font-semibold leading-none tracking-tight",
      e
    ),
    ...a,
  })
);
f.displayName = "CardTitle";

const i = r.forwardRef(({ className: e, ...a }, d) =>
  r.createElement("p", {
    ref: d,
    className: o("text-sm text-muted-foreground", e),
    ...a,
  })
);
i.displayName = "CardDescription";

const l = r.forwardRef(({ className: e, ...a }, d) =>
  r.createElement("div", {
    ref: d,
    className: o("mhub-card-body", e),
    ...a,
  })
);
l.displayName = "CardContent";

const n = r.forwardRef(({ className: e, ...a }, d) =>
  r.createElement("div", {
    ref: d,
    className: o("mhub-card-footer", e),
    ...a,
  })
);
n.displayName = "CardFooter";

export {
  s as Card,
  l as CardContent,
  i as CardDescription,
  n as CardFooter,
  t as CardHeader,
  f as CardTitle,
};
