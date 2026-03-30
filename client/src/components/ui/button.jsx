import * as e from "react";
import { Slot as u } from "@radix-ui/react-slot";
import { cva as c } from "class-variance-authority";
import { cn as f } from "@/lib/utils";

const r = c(
  "mhub-btn inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "mhub-btn-primary",
        destructive: "mhub-btn-destructive",
        outline: "mhub-btn-outline",
        secondary: "mhub-btn-secondary",
        ghost: "mhub-btn-ghost",
        link: "mhub-btn-link",
      },
      size: {
        default: "mhub-btn-md",
        sm: "mhub-btn-sm",
        lg: "mhub-btn-lg",
        icon: "mhub-btn-icon",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const t = e.forwardRef(
  ({ className: o, variant: n, size: i, asChild: s = false, ...a }, d) =>
    e.createElement(s ? u : "button", {
      className: f(r({ variant: n, size: i, className: o })),
      ref: d,
      ...a,
    })
);

t.displayName = "Button";

export { t as Button, r as buttonVariants };
