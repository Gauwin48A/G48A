import e, { useEffect as D, useMemo as E, useState as n } from "react";
import { getAllChannels as I, getPremiumChannels as Ie, followChannel as A } from "../lib/api";
import { Link as C, useNavigate as T } from "react-router-dom";
import {
  Search as V,
  RefreshCw as M,
  Users as P,
  PlusCircle as U,
} from "lucide-react";
import q from "@/components/EmptyState";
import { Button as p } from "@/components/ui/button";
import { Input as K } from "@/components/ui/input";
import { Card as y, CardContent as h } from "@/components/ui/card";
import { useTranslation as O } from "react-i18next";
const $ = ({ variant = "channels" } = {}) => {
  const { t: r } = O(),
    _ = T(),
    [d, m] = n([]),
    [k, x] = n(!1),
    [b, i] = n(null),
    [c, v] = n(null),
    [s, L] = n(""),
    isCentre = variant === "centre",
    titleLabel = isCentre
      ? r("centre_pages_title", { defaultValue: "CentrePages" })
      : r("channels") || "Channels",
    subtitleLabel = isCentre
      ? r("centre_pages_subtitle", {
          defaultValue: "Explore premium seller pages and follow updates.",
        })
      : r("discover_channels") ||
        "Discover communities and follow creators you trust.",
    createLabel = isCentre
      ? r("create_centre_page", { defaultValue: "Create CentrePage" })
      : r("create_channel") || "Create Channel",
    createPath = isCentre ? "/centre/create" : "/channels/create",
    viewPathPrefix = isCentre ? "/centre" : "/channels",
    emptyTitle = isCentre
      ? r("no_centre_pages_yet", { defaultValue: "No CentrePages yet" })
      : r("no_channels_yet") || "No channels yet",
    emptyMessage = isCentre
      ? r("be_first_create_centre_page", {
          defaultValue: "Be the first premium seller to create a CentrePage.",
        })
      : r("be_first_create_channel") || "Be the first to create a channel.",
    u = async () => {
      x(!0), i(null);
      try {
        const o = await (isCentre ? Ie() : I()),
          t = o?.data ?? o;
        m(Array.isArray(t) ? t : []);
      } catch (o) {
        import.meta.env.DEV && console.error("Failed to fetch channels:", o),
          m([]),
          i(r("something_went_wrong") || "Failed to load channels");
      } finally {
        x(!1);
      }
    },
    N = E(() => {
      const o = s.trim().toLowerCase();
      return o
        ? d.filter((t) => {
            const f = String(t.name || "").toLowerCase(),
              a = String(t.description || t.bio || "").toLowerCase(),
              w = String(t.owner_name || t.owner_id || "").toLowerCase();
            return f.includes(o) || a.includes(o) || w.includes(o);
          })
        : d;
    }, [d, s]),
    S = async (o) => {
      if (!c) {
        v(o), i(null);
        try {
          const t = await A(o),
            f = t?.data ?? t,
            a = String(f?.action || "").toLowerCase();
          a === "followed" || a === "unfollowed"
            ? m((w) =>
                w.map((l) => {
                  const F = l.channel_id || l.id;
                  if (String(F) !== String(o)) return l;
                  const B = !!l.is_following,
                    g = a === "followed",
                    j = Number.parseInt(l.follower_count, 10) || 0;
                  return {
                    ...l,
                    is_following: g,
                    follower_count: Math.max(0, j + (g === B ? 0 : g ? 1 : -1)),
                  };
                }),
              )
            : await u();
        } catch (t) {
          const _status = t?.response?.status || t?.status;
          const _msg = String(t?.message || "").toLowerCase();
          // 400 "own channel" errors are expected behaviour — don't surface as a page error.
          if (_status === 400 && (_msg.includes("own") || _msg.includes("yourself") || _msg.includes("yourself") || _msg.includes("cannot follow your"))) {
            import.meta.env.DEV && console.warn("[channels] self-follow blocked by server:", t?.message);
          } else {
            import.meta.env.DEV &&
              console.error("Failed to follow/unfollow channel:", t),
              i(
                t?.message ||
                  r("something_went_wrong") ||
                  "Failed to update follow state",
              );
          }
        } finally {
          v(null);
        }
      }
    };
  return (
    D(() => {
      u();
    }, []),
    e.createElement(
      "div",
      { className: "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 dark:bg-gradient-to-br" },
      e.createElement(
        "div",
        { className: "container mx-auto max-w-5xl p-4 sm:p-6 page-shell page-pad" },
        e.createElement(
          "div",
          {
            className:
              "mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
          },
          e.createElement(
            "div",
            null,
            e.createElement(
              "h1",
              { className: "text-2xl font-bold text-gray-900 dark:text-white dark:text-2xl dark:text-gray-100" },
              titleLabel,
            ),
            e.createElement(
              "p",
              { className: "text-sm text-gray-500 dark:text-gray-400 dark:text-sm dark:text-gray-300" },
              subtitleLabel,
            ),
          ),
          e.createElement(
            C,
            { to: createPath },
            e.createElement(
              p,
              { className: "gap-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700/40 dark:text-white dark:hover:bg-blue-700/40" },
              e.createElement(U, { className: "h-4 w-4" }),
              createLabel,
            ),
          ),
        ),
        e.createElement(
          "div",
          { className: "relative mb-5 mhub-premium-surface rounded-2xl p-3" },
          e.createElement(V, {
            className:
              "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-300",
          }),
          e.createElement(K, {
            value: s,
            onChange: (o) => L(o.target.value),
            placeholder:
              r("search_channels") || "Search by name, owner, or description",
            className: "pl-9",
          }),
        ),
      k
        ? e.createElement(
            "div",
            { className: "space-y-3" },
            [1, 2, 3, 4].map((o) =>
              e.createElement(
                y,
                { key: o, className: "animate-pulse" },
                e.createElement(
                  h,
                  { className: "flex items-center justify-between p-4" },
                  e.createElement(
                    "div",
                    { className: "flex items-center gap-3" },
                    e.createElement("div", {
                      className:
                        "h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 dark:bg-gray-900",
                    }),
                    e.createElement(
                      "div",
                      { className: "space-y-2" },
                      e.createElement("div", {
                        className:
                          "h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 dark:bg-gray-900",
                      }),
                      e.createElement("div", {
                        className:
                          "h-3 w-56 rounded bg-gray-200 dark:bg-gray-700 dark:bg-gray-900",
                      }),
                    ),
                  ),
                  e.createElement("div", {
                    className: "h-9 w-24 rounded bg-gray-200 dark:bg-gray-700 dark:bg-gray-900",
                  }),
                ),
              ),
            ),
          )
        : b
          ? e.createElement(
              y,
              { className: "border-red-200 dark:border-red-600/40" },
              e.createElement(
                h,
                {
                  className: "flex flex-col items-center gap-3 p-6 text-center dark:text-center",
                },
                e.createElement(
                  "p",
                  { className: "text-sm font-medium text-red-600 dark:text-sm dark:text-red-300" },
                  b,
                ),
                e.createElement(
                  p,
                  { variant: "outline", className: "gap-2", onClick: u },
                  e.createElement(M, { className: "h-4 w-4" }),
                  r("retry") || "Retry",
                ),
              ),
            )
          : N.length === 0
            ? e.createElement(q, {
                type: "search",
                title: s
                  ? r("no_channels_match") || "No channels matched your search"
                  : emptyTitle,
                message: s
                  ? r("try_different_keywords") || "Try a different keyword."
                  : emptyMessage,
                actionLabel: s ? "" : createLabel,
                onAction: s ? null : () => _(createPath),
              })
            : e.createElement(
                "ul",
                { className: "space-y-3" },
                N.map((o) => {
                  const t = o.channel_id || o.id;
                  return e.createElement(
                    "li",
                    { key: t },
                    e.createElement(
                      y,
                      null,
                      e.createElement(
                        h,
                        {
                          className:
                            "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between",
                        },
                        e.createElement(
                          "div",
                          { className: "flex items-center gap-3" },
                          o.logo_url || o.profile_pic
                            ? e.createElement("img", {
                                src: o.logo_url || o.profile_pic,
                                alt: "logo",
                                className:
                                  "h-11 w-11 rounded-full object-cover",
                              })
                            : e.createElement(
                                "div",
                                {
                                  className:
                                    "flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300",
                                },
                                e.createElement(P, { className: "h-5 w-5" }),
                              ),
                          e.createElement(
                            "div",
                            null,
                            e.createElement(
                              "p",
                              {
                                className:
                                  "text-base font-semibold text-gray-900 dark:text-white dark:text-base dark:text-gray-100",
                              },
                              o.name,
                            ),
                            e.createElement(
                              "p",
                              {
                                className:
                                  "line-clamp-2 text-xs text-gray-500 dark:text-gray-400 dark:text-xs dark:text-gray-300",
                              },
                              o.description ||
                                o.bio ||
                                r("no_description") ||
                                "No description",
                            ),
                            e.createElement(
                              "p",
                              { className: "mt-1 text-xs text-gray-400 dark:text-xs dark:text-gray-300" },
                              r("owner") || "Owner",
                              ": ",
                              o.owner_name || o.owner_id || "-",
                              " - ",
                              r("followers") || "Followers",
                              ": ",
                              o.follower_count || 0,
                            ),
                          ),
                        ),
                        e.createElement(
                          "div",
                          { className: "flex items-center gap-2" },
                          e.createElement(
                            p,
                            {
                              className: "px-3",
                              onClick: () => S(t),
                              disabled: c === t,
                              variant: o.is_following ? "outline" : "default",
                            },
                            c === t
                              ? r("loading") || "Loading..."
                              : o.is_following
                                ? r("unfollow") || "Unfollow"
                                : r("follow") || "Follow",
                          ),
                          e.createElement(
                            C,
                            {
                              to: `${viewPathPrefix}/${t}`,
                              className:
                                "rounded-md border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:border dark:border-blue-600/40 dark:text-sm dark:hover:bg-blue-950/20",
                            },
                            r("view") || "View",
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
        ),
      )
  );
};
var ee = $;
export { ee as default };
