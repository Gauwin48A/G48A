import e from "react";
import { useToast as m } from "@/hooks/use-toast";
import {
  Toast as c,
  ToastClose as i,
  ToastDescription as T,
  ToastProvider as u,
  ToastTitle as p,
  ToastViewport as E,
} from "@/components/ui/toast";

function w() {
  const { toasts: r } = m();
  return e.createElement(
    u,
    null,
    r.map(function ({ id: a, title: t, description: o, action: n, ...s }) {
      return e.createElement(
        c,
        { key: a, ...s },
        e.createElement(
          "div",
          { className: "grid gap-1" },
          t && e.createElement(p, null, t),
          o && e.createElement(T, null, o)
        ),
        n,
        e.createElement(i)
      );
    }),
    e.createElement(E)
  );
}

export { w as Toaster };
