import r, {
  useState as g,
  useEffect as w,
  useCallback as x,
  useRef as k,
  useMemo as N,
} from "react";
import { Button as u } from "@/components/ui/button";
import { Card as S } from "@/components/ui/card";
import { Avatar as Ve, AvatarFallback as ze } from "@/components/ui/avatar";
import {
  FaHeart as He,
  FaRegHeart as qe,
  FaShare as Ge,
  FaEye as Qe,
  FaHandHoldingHeart as Ye,
  FaBookmark as Po,
  FaRegBookmark as Ro,
  FaEllipsisV as To,
} from "react-icons/fa";
import { useNavigate as Je, useLocation as Ke } from "react-router-dom";
import { useFilter as We } from "@/context/FilterContext";
import { useTranslation as Xe } from "react-i18next";
import Ze from "@/components/BuyerInterestModal";
import { translatePosts as Re } from "@/utils/translateContent";
import { useAuth as et } from "@/context/AuthContext";
import A from "@/lib/api";
import { getUserId as tt, isAuthenticated as rt } from "@/utils/authStorage";
import { fetchCategoriesCached as at } from "@/services/categoriesService";
import pt from "@/components/ShareLinkDialog";
import { resolveMediaUrl as utm } from "@/lib/mediaUrl";
const ve = 5,
  SHOW_POST_ID_CHIP = !0,
  D = "/placeholder.svg",
  st = {
    search: "",
    category: "All",
    sortBy: "",
    location: "",
    minPrice: "",
    maxPrice: "",
    priceRange: "",
    startDate: "",
    endDate: "",
  },
  ke = (s) => s?.post_id ?? s?.id ?? null,
  I = (s) => {
    if (s == null) return "";
    const c = String(s).trim();
    return c.length ? c : "";
  },
  ot = (s) => {
    const c = Number(s);
    return Number.isFinite(c) ? c : s || 0;
  },
  nt = (s) => {
    if (!s) return "";
    const c = new Date(s);
    if (Number.isNaN(c.getTime())) return "";
    const l = Date.now() - c.getTime(),
      t = Math.max(1, Math.floor(l / 6e4));
    if (t < 60) return `${t}m ago`;
    const m = Math.floor(t / 60);
    return m < 24 ? `${m}h ago` : `${Math.floor(m / 24)}d ago`;
  },
  isDateOnlyValue = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")),
  toInclusiveEndDateValue = (s) =>
    isDateOnlyValue(s) ? `${s}T23:59:59.999` : s,
  Ne = (s) => {
    if (!s) return D;
    const c = s.image_url || s.imageUrl || s.thumbnail;
    if (typeof c == "string" && c.trim()) return utm(c, D);
    const l = s.images;
    if (Array.isArray(l) && l.length) return utm(l[0] || D, D);
    if (typeof l == "string" && l.trim())
      try {
        const t = JSON.parse(l);
        return Array.isArray(t) && t.length ? utm(t[0] || D, D) : utm(l, D);
      } catch {
        return utm(l, D);
      }
    return D;
  },
  lt = (s, c) => {
    const l = new Map();
    return (
      s.forEach((t) => {
        const m = ke(t);
        m !== null && l.set(String(m), t);
      }),
      c.forEach((t) => {
        const m = ke(t);
        m !== null && l.set(String(m), t);
      }),
      Array.from(l.values())
    );
  },
  it = () => {
    const { t: s, i18n: c } = Xe(),
      l = c.language,
      { filters: t, setFilters: m } = We(),
      { user: $ } = et(),
      Z = Ke(),
      [f, O] = g([]),
      [V, z] = g(null),
      [E, R] = g(!1),
      [L, T] = g(1),
      [H, ee] = g(!0),
      [Pe, Ce] = g(0),
      q = 6,
      y = Je(),
      [h, te] = g([]),
      re = k(Date.now()),
      P = k(0),
      v = k(null);
    w(() => {
      const e = new URLSearchParams(Z.search),
        a = e.get("category") || "";
      let o = a;
      if (a && h.length > 0 && !isNaN(parseInt(a, 10))) {
        const i = h.find(
          (p) =>
            String(p.category_id) === String(a) || String(p.id) === String(a),
        );
        i && (o = i.name);
      }
      m((n) => ({
        ...n,
        category: o,
        search: e.get("search") || "",
        location: e.get("location") || "",
        minPrice: e.get("minPrice") || "",
        maxPrice: e.get("maxPrice") || "",
        startDate: e.get("startDate") || "",
        endDate: e.get("endDate") || "",
        sortBy: e.get("sortBy") || n.sortBy || "",
      }));
    }, [Z.search, h, m]);
    const [Be, _e] = g(null),
      [ae, Se] = g({}),
      [Ae, se] = g({}),
      [De, oe] = g({}),
      [ne, M] = g(""),
      [Ie, le] = g(!1),
      [G, ie] = g(null),
      [menuPostId, setMenuPostId] = g(null),
      [savedPosts, setSavedPosts] = g({}),
      [shareDialogOpen, setShareDialogOpen] = g(!1),
      [shareDialogUrl, setShareDialogUrl] = g(""),
      de = k({}),
      C = N(() => rt($), [$]);
    (w(() => {
      const e = sessionStorage.getItem("allPostsScrollPosition");
      e &&
        f.length > 0 &&
        requestAnimationFrame(() => {
          (window.scrollTo(0, parseInt(e, 10)),
            sessionStorage.removeItem("allPostsScrollPosition"));
        });
    }, [f.length]),
      w(() => {
        let e = !0;
        return (
          (async () => {
            try {
              const o = await at();
              if (!e) return;
              te(Array.isArray(o) ? o : []);
            } catch (o) {
              if (!e) return;
              (console.error("Failed to fetch categories:", o), te([]));
            }
          })(),
          () => {
            e = !1;
          }
        );
      }, []));
    const Le = {
        Electronics: "\u{1F4BB}",
        Mobiles: "\u{1F4F1}",
        Fashion: "\u{1F457}",
        Furniture: "\u{1F6CB}\uFE0F",
        Vehicles: "\u{1F697}",
        Books: "\u{1F4DA}",
        Sports: "\u26BD",
        "Home Appliances": "\u{1F3E0}",
        Beauty: "\u{1F484}",
        Kids: "\u{1F9F8}",
        Grocery: "\u{1F6D2}",
        Toys: "\u{1F3AE}",
        Jewelry: "\u{1F48E}",
        Tools: "\u{1F527}",
        Garden: "\u{1F33F}",
        "Pet Supplies": "\u{1F43E}",
      },
      ce = N(
        () =>
          h.reduce((e, a) => ((e[a.name] = a.category_id || a.name), e), {}),
        [h],
      ),
      Q = N(
        () =>
          typeof window > "u"
            ? ""
            : localStorage.getItem("mhub_user_city") || "",
        [],
      ),
      me = x((e) => {
        const a = new URLSearchParams();
        return (
          e.search && a.set("search", e.search),
          e.category && e.category !== "All" && a.set("category", e.category),
          e.location && a.set("location", e.location),
          e.minPrice && a.set("minPrice", e.minPrice),
          e.maxPrice && a.set("maxPrice", e.maxPrice),
          e.startDate && a.set("startDate", e.startDate),
          e.endDate && a.set("endDate", e.endDate),
          e.sortBy && a.set("sortBy", e.sortBy),
          a.toString()
        );
      }, []),
      b = x(
        (e) => {
          const a = { ...t, ...e };
          (m(a), T(1));
          const o = me(a);
          y(o ? `/all-posts?${o}` : "/all-posts");
        },
        [me, t, y, m],
      ),
      $e = x(
        (e) => {
          b({ category: e });
        },
        [b],
      ),
      Ee = x(() => {
        b({ category: "All" });
      }, [b]),
      Y = x(() => {
        (m(st), T(1), y("/all-posts"));
      }, [y, m]),
      Te = x(
        (e) => {
          if (e === "price") {
            b({ minPrice: "", maxPrice: "", priceRange: "" });
            return;
          }
          if (e === "date") {
            b({ startDate: "", endDate: "" });
            return;
          }
          b({ [e]: e === "category" ? "All" : "" });
        },
        [b],
      ),
      ue = N(
        () =>
          !!t.search ||
          !!t.location ||
          !!t.minPrice ||
          !!t.maxPrice ||
          !!t.startDate ||
          !!t.endDate ||
          !!t.sortBy ||
          !!(t.category && t.category !== "All"),
        [
          t.category,
          t.endDate,
          t.location,
          t.maxPrice,
          t.minPrice,
          t.search,
          t.sortBy,
          t.startDate,
        ],
      ),
      ge = N(() => {
        const e = [];
        return (
          t.search && e.push({ key: "search", label: `Search: ${t.search}` }),
          t.category &&
            t.category !== "All" &&
            e.push({ key: "category", label: `Category: ${t.category}` }),
          t.location &&
            e.push({ key: "location", label: `Location: ${t.location}` }),
          (t.minPrice || t.maxPrice) &&
            e.push({
              key: "price",
              label: `Price: ${t.minPrice || "0"} - ${t.maxPrice || "any"}`,
            }),
          (t.startDate || t.endDate) &&
            e.push({
              key: "date",
              label: `Date: ${t.startDate || "any"} to ${t.endDate || "any"}`,
            }),
          t.sortBy && e.push({ key: "sortBy", label: `Sort: ${t.sortBy}` }),
          e
        );
      }, [
        t.category,
        t.endDate,
        t.location,
        t.maxPrice,
        t.minPrice,
        t.search,
        t.sortBy,
        t.startDate,
      ]),
      be = x(() => {
        const e = new URLSearchParams();
        let a = t.category,
          o = t.search;
        if (t.search && (t.category === "All" || !t.category)) {
          const n = h.find(
            (i) => i.name.toLowerCase() === t.search.trim().toLowerCase(),
          );
          n && ((a = n.name), (o = ""));
        }
        if (
          (o && e.append("search", o),
          t.location && e.append("location", t.location),
          a && a !== "All")
        ) {
          const n = ce[a] || a;
          e.append("category", n);
        }
        if (
          (t.minPrice && e.append("minPrice", t.minPrice),
          t.maxPrice && e.append("maxPrice", t.maxPrice),
          t.priceRange && !t.minPrice && !t.maxPrice)
        ) {
          const [n, i] = t.priceRange.split("-").map(Number);
          (isNaN(n) || e.append("minPrice", n),
            isNaN(i) || e.append("maxPrice", i));
        }
        return (
          t.startDate && e.append("startDate", t.startDate),
          t.endDate && e.append("endDate", toInclusiveEndDateValue(t.endDate)),
          t.sortBy &&
            (t.sortBy === "price_asc"
              ? (e.append("sortBy", "price"), e.append("sortOrder", "asc"))
              : t.sortBy === "price_desc"
                ? (e.append("sortBy", "price"), e.append("sortOrder", "desc"))
                : t.sortBy === "date_desc"
                  ? (e.append("sortBy", "created_at"),
                    e.append("sortOrder", "desc"))
                  : t.sortBy === "date_asc"
                    ? (e.append("sortBy", "created_at"),
                      e.append("sortOrder", "asc"))
                    : (e.append("sortBy", t.sortBy),
                      e.append("sortOrder", "desc"))),
          e.append("page", L),
          e.append("limit", q),
          e
        );
      }, [
        h,
        ce,
        L,
        t.category,
        t.endDate,
        t.location,
        t.maxPrice,
        t.minPrice,
        t.priceRange,
        t.search,
        t.sortBy,
        t.startDate,
        q,
      ]);
    (w(() => {
      const e = P.current + 1;
      ((P.current = e), v.current && v.current.abort());
      const a = new AbortController();
      return (
        (v.current = a),
        R(!0),
        z(null),
        (async () => {
          try {
            const n = be();
            (L === 1 && (re.current = Date.now()),
              n.append("refresh", String(re.current)));
            let i;
            try {
              i = await A.get(`/posts?${n.toString()}`, { signal: a.signal });
            } catch (d) {
              if (d?.name === "AbortError") return;
              i = await A.get(`/posts/for-you?${n.toString()}`, {
                signal: a.signal,
              });
            }
            if (e !== P.current) return;
            let p = Array.isArray(i.posts) ? i.posts : [];
            if ((l && l !== "en" && (p = await Re(p, l)), e !== P.current))
              return;
            (O(L === 1 ? p : (d) => lt(d, p)), z(null));
            const F = {},
              _ = {};
            (p.forEach((d) => {
              ((F[d.post_id || d.id] = d.likes || 0),
                (_[d.post_id || d.id] = d.views_count || d.views || 0));
            }),
              se((d) => ({ ...d, ...F })),
              oe((d) => ({ ...d, ..._ })),
              ee(p.length === q));
          } catch (n) {
            if (n?.name === "AbortError" || e !== P.current) return;
            (z(n.message || "Failed to fetch posts"), O([]), ee(!1));
          } finally {
            (v.current === a && (v.current = null), e === P.current && R(!1));
          }
        })(),
        () => {
          (a.abort(), v.current === a && (v.current = null));
        }
      );
    }, [be, l, L, Pe]),
      w(() => {
        T(1);
      }, [
        t.search,
        t.location,
        t.category,
        t.priceRange,
        t.minPrice,
        t.maxPrice,
        t.startDate,
        t.endDate,
        t.sortBy,
      ]));
    const J = x(() => {
      E || !H || T((e) => e + 1);
    }, [E, H]);
    w(() => {
      const e = () => {
        C &&
          window.innerHeight + document.documentElement.scrollTop >=
            document.documentElement.offsetHeight - 1e3 &&
          J();
      };
      return (
        window.addEventListener("scroll", e, { passive: !0 }),
        () => window.removeEventListener("scroll", e)
      );
    }, [J, C]);
    const K = N(
        () => (!f || f.length === 0 ? [] : C ? f : f.slice(0, ve)),
        [f, C],
      ),
      U = k(new Set()),
      fe = k(new Set()),
      B = k(null),
      W = x((e) => {
        const a = I(e);
        !a ||
          fe.current.has(a) ||
          (fe.current.add(a),
          U.current.add(a),
          oe((o) => ({ ...o, [a]: (o[a] || 0) + 1 })));
      }, []);
    (w(() => {
      const e = async () => {
          if (U.current.size === 0) return;
          const o = Array.from(U.current);
          U.current.clear();
          try {
            await A.post("/posts/batch-view", { postIds: o });
          } catch (n) {
            import.meta.env.DEV && console.error("Batch view error:", n);
          }
        },
        a = setInterval(() => {
          e();
        }, 5e3);
      return () => {
        (clearInterval(a), e());
      };
    }, []),
      w(
        () => (
          B.current && B.current.disconnect(),
          (B.current = new IntersectionObserver(
            (e) => {
              e.forEach((a) => {
                if (a.isIntersecting) {
                  const o = I(a.target.dataset.postId);
                  W(o);
                }
              });
            },
            { threshold: 0.5 },
          )),
          Object.values(de.current).forEach((e) => {
            e && B.current.observe(e);
          }),
          () => {
            B.current && B.current.disconnect();
          }
        ),
        [f, W],
      ));
    const Me = async (e) => {
        const a = ae[e];
        (Se((o) => ({ ...o, [e]: !o[e] })),
          se((o) => ({ ...o, [e]: (o[e] || 0) + (a ? -1 : 1) })));
        try {
          await A.post(`/posts/${e}/like`);
        } catch {}
      },
      Ue = async (e) => {
        const a = I(e);
        if (!a) return;
        const o = `${window.location.origin}/post/${a}`;
        (setShareDialogUrl(o), setShareDialogOpen(!0));
        try {
          await A.post(`/posts/${a}/share`);
        } catch {}
      },
      toggleSave = async (e) => {
        const a = I(e);
        if (!a) return;
        if (!C) {
          (M("Please login to save posts"),
            setTimeout(() => M(""), 2e3),
            y("/login", { state: { returnTo: "/all-posts" } }));
          return;
        }
        const o = !!savedPosts[a];
        setSavedPosts((n) => ({ ...n, [a]: !o }));
        try {
          o
            ? await A.delete(`/wishlist/${a}`)
            : await A.post("/wishlist", { postId: a });
        } catch {
          (setSavedPosts((n) => ({ ...n, [a]: o })),
            M(o ? "Failed to remove saved post" : "Failed to save post"),
            setTimeout(() => M(""), 2e3));
        }
      },
      je = async (e) => {
        const a = I(e);
        if (!a) return;
        sessionStorage.setItem(
          "allPostsScrollPosition",
          window.scrollY.toString(),
        );
        const o = f.find((i) => I(i.id) === a || I(i.post_id) === a);
        W(a);
        const n = tt($);
        (n &&
          A.post("/recently-viewed/track", {
            postId: a,
            userId: n,
            source: "allposts",
          }).catch(() => {}),
          o ? y(`/post/${a}`, { state: { post: o } }) : y(`/post/${a}`));
      },
      pe = f
        .filter((e) => e.isSponsored === !0 || e.is_sponsored === !0)
        .slice(0, 5),
      xe = t.search
        ? h.find((e) => e.name.toLowerCase() === t.search.trim().toLowerCase())
            ?.name
        : null,
      j =
        (!t.category || t.category === "All") && xe ? xe : t.category || "All",
      ye = N(() => {
        const e = new Date();
        const a = e.getFullYear();
        const o = String(e.getMonth() + 1).padStart(2, "0");
        const n = String(e.getDate()).padStart(2, "0");
        return `${a}-${o}-${n}`;
      }, []),
      Fe = x(() => {
        Ce((e) => e + 1);
      }, []);
    return r.createElement(
      "div",
      {
        className:
          "bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300 pb-24",
      },
      r.createElement(
        "div",
        {
          className:
            "w-full flex justify-center px-4 pt-2 pb-4 sticky top-[80px] z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm",
        },
        r.createElement(
          "div",
          {
            className:
              "flex gap-2 md:gap-4 bg-gradient-to-r from-blue-100 via-white to-blue-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-2xl shadow-lg py-3 px-3 md:px-6 items-center overflow-x-auto scrollbar-hide max-w-full",
          },
          r.createElement(
            "button",
            {
              onClick: Ee,
              className: `flex flex-col items-center cursor-pointer hover:scale-110 transition px-3 py-2 rounded-xl min-w-[60px] ${j === "All" ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400" : ""}`,
            },
            r.createElement(
              "span",
              { className: "text-xl md:text-2xl mb-1" },
              "\u{1F4E6}",
            ),
            r.createElement(
              "span",
              {
                className: `font-semibold text-xs md:text-sm ${j === "All" ? "text-white" : "text-gray-700 dark:text-gray-300"}`,
              },
              s("all"),
            ),
          ),
          h.map((e) =>
            r.createElement(
              "button",
              {
                key: e.category_id || e.name,
                onClick: () => $e(e.name),
                className: `flex flex-col items-center cursor-pointer hover:scale-110 transition px-3 py-2 rounded-xl min-w-[70px] whitespace-nowrap ${j === e.name ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400" : ""}`,
              },
              r.createElement(
                "span",
                { className: "text-xl md:text-2xl mb-1" },
                Le[e.name] || "\u{1F4E6}",
              ),
              r.createElement(
                "span",
                {
                  className: `font-semibold text-xs md:text-sm ${j === e.name ? "text-white" : "text-gray-700 dark:text-gray-300"}`,
                },
                s(e.name.toLowerCase().replace(" ", "_")) || e.name,
              ),
            ),
          ),
        ),
      ),
      r.createElement(
        "div",
        { className: "w-full flex justify-center px-3" },
        r.createElement(
          "div",
          {
            className:
              "w-full max-w-5xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-3 md:p-4 mb-3",
          },
          r.createElement(
            "div",
            { className: "flex flex-wrap items-center gap-2" },
            r.createElement(
              u,
              {
                type: "button",
                variant: "outline",
                className: "h-8 border-blue-200 text-blue-700",
                onClick: () => b({ minPrice: "", maxPrice: "1000" }),
              },
              "Under 1000",
            ),
            r.createElement(
              u,
              {
                type: "button",
                variant: "outline",
                className: "h-8 border-blue-200 text-blue-700",
                onClick: () => b({ minPrice: "1000", maxPrice: "5000" }),
              },
              "1000-5000",
            ),
            r.createElement(
              u,
              {
                type: "button",
                variant: "outline",
                className: "h-8 border-blue-200 text-blue-700",
                onClick: () => b({ sortBy: "date_desc" }),
              },
              "Latest",
            ),
            r.createElement(
              u,
              {
                type: "button",
                variant: "outline",
                className: "h-8 border-blue-200 text-blue-700",
                onClick: () => b({ startDate: ye, endDate: ye }),
              },
              "Posted Today",
            ),
            Q &&
              r.createElement(
                u,
                {
                  type: "button",
                  variant: "outline",
                  className: "h-8 border-blue-200 text-blue-700",
                  onClick: () => b({ location: Q }),
                },
                "Near ",
                Q,
              ),
            ue &&
              r.createElement(
                u,
                {
                  type: "button",
                  variant: "ghost",
                  className:
                    "h-8 text-red-600 hover:text-red-700 hover:bg-red-50",
                  onClick: Y,
                },
                "Clear all filters",
              ),
          ),
          ge.length > 0 &&
            r.createElement(
              "div",
              { className: "mt-3 flex flex-wrap gap-2" },
              ge.map((e) =>
                r.createElement(
                  "button",
                  {
                    key: e.key,
                    type: "button",
                    onClick: () => Te(e.key),
                    className:
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700 text-xs text-blue-800 dark:text-blue-200",
                    title: "Remove filter",
                  },
                  r.createElement("span", null, e.label),
                  r.createElement("span", { className: "font-semibold" }, "x"),
                ),
              ),
            ),
        ),
      ),
      r.createElement("div", { className: "h-4 md:h-6" }),
      r.createElement(
        "div",
        { className: "w-full flex justify-center" },
        r.createElement(
          "div",
          {
            className:
              "flex flex-col md:flex-row items-center justify-between px-3 md:px-8 py-6 md:py-8 bg-blue-100 dark:bg-gray-800 rounded-xl mb-8 shadow-lg w-full max-w-5xl relative overflow-hidden border border-blue-200 dark:border-gray-700 mt-0 md:mt-6",
          },
          r.createElement(
            "div",
            { className: "flex flex-col gap-2 z-10 w-full md:w-auto" },
            r.createElement(
              "span",
              {
                className:
                  "text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1",
              },
              s("great_deals"),
            ),
            r.createElement(
              "span",
              {
                className:
                  "text-sm md:text-base text-blue-800 dark:text-blue-200 font-medium mb-2",
              },
              s("up_to_off"),
            ),
            r.createElement(
              u,
              {
                className:
                  "bg-blue-600 text-white font-semibold px-5 md:px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition w-fit text-sm md:text-base",
              },
              s("shop_now"),
            ),
          ),
          r.createElement(
            "div",
            { className: "mt-4 md:mt-0 md:ml-8 z-10" },
            r.createElement(
              "div",
              {
                className:
                  "w-24 h-16 md:w-32 md:h-24 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center",
              },
              r.createElement(
                "svg",
                {
                  width: "64",
                  height: "48",
                  fill: "none",
                  viewBox: "0 0 64 48",
                },
                r.createElement("rect", {
                  width: "64",
                  height: "48",
                  rx: "8",
                  fill: "#2563eb",
                }),
              ),
            ),
          ),
          r.createElement("div", {
            className:
              "absolute right-0 bottom-0 opacity-10 w-32 h-24 md:w-40 md:h-32 bg-blue-300 dark:bg-blue-700 rounded-bl-2xl",
          }),
        ),
      ),
      r.createElement(
        "div",
        { className: "w-full flex flex-col items-center mb-8" },
        r.createElement(
          "h2",
          {
            className:
              "text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 w-full max-w-5xl px-3 md:px-0",
          },
          s("sponsored_deals"),
        ),
        r.createElement(
          "div",
          {
            className:
              "flex gap-4 md:gap-6 w-full max-w-5xl overflow-x-auto scrollbar-hide px-3 md:px-0",
          },
          pe.length === 0
            ? r.createElement(
                "div",
                { className: "text-center text-blue-400 dark:text-blue-300" },
                s("no_sponsored_deals"),
              )
            : pe.map((e, a) =>
                r.createElement(
                  S,
                  {
                    key: e.id || e._id || a,
                    className:
                      "rounded-xl shadow bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex flex-col items-center p-3 md:p-4 min-w-[140px] max-w-[160px] md:min-w-[200px] md:max-w-[220px] hover:scale-105 transition-transform duration-200",
                  },
                  r.createElement("img", {
                    src: Ne(e),
                    alt: e.title || "Post",
                    className:
                      "w-20 h-20 md:w-24 md:h-24 object-cover rounded mb-2 bg-gray-100 dark:bg-gray-700",
                    onError: (o) => {
                      o.currentTarget.src = D;
                    },
                  }),
                  r.createElement(
                    "div",
                    {
                      className:
                        "font-semibold text-gray-800 dark:text-white text-xs md:text-base text-center mb-1 line-clamp-2",
                    },
                    e.title,
                  ),
                  r.createElement(
                    "div",
                    { className: "text-yellow-500 text-xs mb-1" },
                    "\u2605\u2605\u2605\u2605\u2605",
                  ),
                  r.createElement(
                    "div",
                    {
                      className:
                        "text-blue-900 dark:text-blue-300 text-base md:text-lg font-bold mb-1",
                    },
                    "\u20B9",
                    ot(e.price),
                  ),
                  r.createElement(
                    u,
                    {
                      className:
                        "bg-blue-600 text-white w-full mt-1 md:mt-2 text-xs md:text-sm py-1 md:py-2",
                      onClick: () => y(`/post/${e.post_id || e.id}`),
                    },
                    s("view") || "View",
                  ),
                ),
              ),
        ),
      ),
      r.createElement(
        "div",
        { className: "w-full flex flex-col items-center mb-10" },
        r.createElement(
          "h2",
          {
            className:
              "text-xl md:text-2xl font-bold text-blue-800 dark:text-blue-300 mb-4 w-full max-w-5xl px-3 md:px-0",
          },
          s("all_posts"),
        ),
        r.createElement(
          "div",
          {
            className:
              "flex flex-col gap-6 w-full max-w-5xl mx-auto px-2 md:px-0",
          },
          E
            ? Array.from({ length: 3 }).map((e, a) =>
                r.createElement(
                  S,
                  {
                    key: `all-posts-skeleton-${a}`,
                    className:
                      "rounded-2xl border border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-pulse",
                  },
                  r.createElement("div", {
                    className:
                      "h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3",
                  }),
                  r.createElement("div", {
                    className:
                      "h-48 w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-3",
                  }),
                  r.createElement("div", {
                    className:
                      "h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded mb-2",
                  }),
                  r.createElement("div", {
                    className: "h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded",
                  }),
                ),
              )
            : V
              ? r.createElement(
                  S,
                  {
                    className:
                      "border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-5",
                  },
                  r.createElement(
                    "p",
                    {
                      className: "text-sm text-red-700 dark:text-red-300 mb-3",
                    },
                    V,
                  ),
                  r.createElement(
                    "div",
                    { className: "flex flex-wrap gap-2" },
                    r.createElement(
                      u,
                      {
                        type: "button",
                        className: "bg-red-600 text-white hover:bg-red-700",
                        onClick: Fe,
                      },
                      "Retry",
                    ),
                    ue &&
                      r.createElement(
                        u,
                        {
                          type: "button",
                          variant: "outline",
                          className: "border-red-200 text-red-700",
                          onClick: Y,
                        },
                        "Reset filters",
                      ),
                  ),
                )
              : K.length === 0
                ? r.createElement(
                    S,
                    {
                      className:
                        "border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-6 text-center",
                    },
                    r.createElement(
                      "h3",
                      {
                        className:
                          "text-base md:text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2",
                      },
                      "No results for the current filters",
                    ),
                    r.createElement(
                      "p",
                      {
                        className:
                          "text-sm text-blue-700 dark:text-blue-300 mb-4",
                      },
                      "Try broadening search terms, changing category, or clearing filters.",
                    ),
                    r.createElement(
                      "div",
                      { className: "flex flex-wrap justify-center gap-2" },
                      r.createElement(
                        u,
                        {
                          type: "button",
                          className: "bg-blue-600 text-white hover:bg-blue-700",
                          onClick: Y,
                        },
                        "Reset filters",
                      ),
                      r.createElement(
                        u,
                        {
                          type: "button",
                          variant: "outline",
                          className: "border-blue-200 text-blue-700",
                          onClick: () => y("/categories"),
                        },
                        "Browse categories",
                      ),
                    ),
                  )
                : K.map((e) => {
                    const a = I(e.post_id || e.id),
                      o =
                        e.user?.name ||
                        e.user_name ||
                        e.username ||
                        s("unknown") ||
                        "Unknown",
                      n = String(o || "U")
                        .charAt(0)
                        .toUpperCase(),
                      i = Number(e.user?.rating || e.seller_rating || 0),
                      p =
                        e.category || e.category_name || s("all") || "General",
                      F = !!(
                        e.user?.isVerified ||
                        e.is_verified ||
                        e.aadhaar_verified ||
                        e.pan_verified
                      ),
                      _ = String(e.description || ""),
                      d = Be === a,
                      Oe = _.length >= 120,
                      he = nt(e.created_at || e.createdAt),
                      we = e.location || e.city || e.area || "";
                    return r.createElement(
                      S,
                      {
                        key: a,
                        ref: (X) => {
                          de.current[a] = X;
                        },
                        "data-post-id": a,
                        className:
                          "rounded-2xl shadow bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex flex-col p-0 overflow-hidden hover:shadow-xl transition-shadow",
                      },
                      r.createElement(
                        "div",
                        {
                          className:
                            "flex items-start gap-3 px-4 pt-4 pb-2 relative",
                        },
                        r.createElement(
                          Ve,
                          { className: "w-10 h-10" },
                          r.createElement(
                            ze,
                            { className: "dark:bg-gray-700 dark:text-white" },
                            n || "U",
                          ),
                        ),
                        r.createElement(
                          "div",
                          { className: "flex-1 min-w-0 pr-10" },
                          r.createElement(
                            "div",
                            { className: "flex items-center gap-2" },
                            r.createElement(
                              "span",
                              {
                                className:
                                  "font-semibold text-blue-900 dark:text-blue-200 text-base md:text-lg truncate",
                              },
                              o,
                            ),
                            F &&
                              r.createElement(
                                "span",
                                {
                                  className:
                                    "inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full",
                                  title: `KYC Verified${e.user?.aadhaarVerified ? " (Aadhaar)" : ""}${e.user?.panVerified ? " (PAN)" : ""}`,
                                },
                                r.createElement(
                                  "svg",
                                  {
                                    className: "w-3 h-3",
                                    fill: "currentColor",
                                    viewBox: "0 0 20 20",
                                  },
                                  r.createElement("path", {
                                    fillRule: "evenodd",
                                    d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
                                    clipRule: "evenodd",
                                  }),
                                ),
                                s("verified") || "Verified",
                              ),
                            i > 0 &&
                              r.createElement(
                                "span",
                                {
                                  className:
                                    "text-yellow-500 text-xs font-medium",
                                },
                                "\u2605 ",
                                i.toFixed(1),
                              ),
                          ),
                          r.createElement(
                            "div",
                            {
                              className:
                                "mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400",
                            },
                            r.createElement(
                              "span",
                              {
                                className:
                                  "inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium",
                              },
                              p,
                            ),
                            he &&
                              r.createElement(
                                "span",
                                {
                                  className:
                                    "inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700",
                                },
                                "Posted ",
                                he,
                              ),
                            we &&
                              r.createElement(
                                "span",
                                {
                                  className:
                                    "inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700",
                                },
                                we,
                              ),
                            SHOW_POST_ID_CHIP &&
                              r.createElement(
                                "span",
                                {
                                  className:
                                    "inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 font-semibold text-gray-600 dark:text-gray-200",
                                },
                                "Post ID: ",
                                a,
                              ),
                          ),
                        ),
                        r.createElement(
                          "button",
                          {
                            type: "button",
                            onClick: () =>
                              setMenuPostId((t) => (t === a ? null : a)),
                            className:
                              "absolute right-4 top-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700",
                            title: "More options",
                          },
                          r.createElement(To, { className: "w-4 h-4" }),
                        ),
                        menuPostId === a &&
                          r.createElement(
                            "div",
                            {
                              className:
                                "absolute right-4 top-14 z-20 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1",
                            },
                            r.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  (Ue(a), setMenuPostId(null));
                                },
                                className:
                                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                              },
                              s("share") || "Share",
                            ),
                            r.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  (toggleSave(a), setMenuPostId(null));
                                },
                                className:
                                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg",
                              },
                              savedPosts[a]
                                ? s("saved") || "Saved"
                                : s("save") || "Save",
                            ),
                            r.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: () => {
                                  (M("Report feature coming soon"),
                                    setTimeout(() => M(""), 2e3),
                                    setMenuPostId(null));
                                },
                                className:
                                  "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg",
                              },
                              "Report",
                            ),
                          ),
                      ),
                      r.createElement("img", {
                        src: Ne(e),
                        alt: e.title || "Post",
                        className:
                          "w-full h-48 md:h-56 object-cover bg-gray-100 dark:bg-gray-700",
                        onError: (X) => {
                          X.currentTarget.src = D;
                        },
                      }),
                      r.createElement(
                        "div",
                        {
                          className:
                            "px-4 py-3 text-gray-800 dark:text-gray-200 text-sm md:text-base",
                        },
                        d || !Oe
                          ? _ ||
                              r.createElement(
                                "span",
                                {
                                  className:
                                    "italic text-gray-400 dark:text-gray-500",
                                },
                                s("no_description") || "No description",
                              )
                          : r.createElement(
                              r.Fragment,
                              null,
                              _.slice(0, 120),
                              "...",
                              " ",
                              r.createElement(
                                "button",
                                {
                                  className:
                                    "text-blue-600 dark:text-blue-400 font-semibold hover:underline",
                                  onClick: () => _e(a),
                                },
                                s("view_more"),
                              ),
                            ),
                      ),
                      r.createElement(
                        "div",
                        {
                          className:
                            "flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700",
                        },
                        r.createElement(
                          "div",
                          { className: "flex flex-wrap gap-4" },
                          r.createElement(
                            "button",
                            {
                              className:
                                "flex items-center gap-1 font-semibold focus:outline-none dark:text-gray-200",
                              onClick: () => Me(a),
                            },
                            ae[a]
                              ? r.createElement(He, {
                                  className: "w-4 h-4 text-red-500",
                                })
                              : r.createElement(qe, {
                                  className:
                                    "w-4 h-4 text-black dark:text-gray-300",
                                }),
                            " ",
                            s("like"),
                            " ",
                            Ae[a] || 0,
                          ),
                          r.createElement(
                            "button",
                            {
                              className:
                                "flex items-center gap-1 text-black dark:text-gray-200 font-semibold focus:outline-none",
                              onClick: () => Ue(a),
                            },
                            r.createElement(Ge, { className: "w-4 h-4" }),
                            " ",
                            s("share"),
                          ),
                          r.createElement(
                            "button",
                            {
                              className:
                                "flex items-center gap-1 text-gray-700 dark:text-gray-200 font-semibold focus:outline-none",
                              onClick: () => toggleSave(a),
                            },
                            savedPosts[a]
                              ? r.createElement(Po, {
                                  className: "w-4 h-4 text-blue-600",
                                })
                              : r.createElement(Ro, { className: "w-4 h-4" }),
                            " ",
                            savedPosts[a]
                              ? s("saved") || "Saved"
                              : s("save") || "Save",
                          ),
                          r.createElement(
                            "button",
                            {
                              className:
                                "flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold focus:outline-none hover:text-green-700",
                              onClick: () => {
                                (ie(e), le(!0));
                              },
                            },
                            r.createElement(Ye, { className: "w-4 h-4" }),
                            " ",
                            s("interested") || "Interested",
                          ),
                          r.createElement(
                            "span",
                            {
                              className:
                                "flex items-center gap-1 text-gray-500 dark:text-gray-400 font-semibold",
                            },
                            r.createElement(Qe, { className: "w-4 h-4" }),
                            De[a] || 0,
                          ),
                        ),
                        r.createElement(
                          u,
                          {
                            className:
                              "bg-blue-600 text-white px-4 py-1 text-xs md:text-sm font-medium rounded",
                            onClick: () => je(a),
                          },
                          s("view_details") || "View Details",
                        ),
                      ),
                    );
                  }),
        ),
        C &&
          H &&
          !E &&
          !V &&
          K.length > 0 &&
          r.createElement(
            u,
            {
              type: "button",
              variant: "outline",
              className: "mt-5 border-blue-300 text-blue-700",
              onClick: J,
            },
            "Load more posts",
          ),
        !C &&
          f.length > ve &&
          r.createElement(
            S,
            {
              className:
                "w-full max-w-5xl mt-6 p-5 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",
            },
            r.createElement(
              "div",
              {
                className:
                  "flex flex-col md:flex-row md:items-center md:justify-between gap-3",
              },
              r.createElement(
                "div",
                null,
                r.createElement(
                  "p",
                  {
                    className: "font-semibold text-blue-900 dark:text-blue-200",
                  },
                  s("unlock_more_posts") || "Unlock more posts",
                ),
                r.createElement(
                  "p",
                  { className: "text-sm text-blue-700 dark:text-blue-300" },
                  s("login_for_full_feed") ||
                    "Sign in to browse the full feed, save searches, and get personalized recommendations.",
                ),
              ),
              r.createElement(
                u,
                {
                  className: "bg-blue-600 text-white hover:bg-blue-700",
                  onClick: () => y("/login"),
                },
                s("login") || "Login",
              ),
            ),
          ),
        ne &&
          r.createElement(
            "div",
            {
              className:
                "fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-[9999]",
            },
            ne,
          ),
      ),
      r.createElement(Ze, {
        isOpen: Ie,
        onClose: () => {
          (le(!1), ie(null));
        },
        postId: G?.post_id || G?.id,
        postTitle: G?.title,
      }),
      r.createElement(pt, {
        open: shareDialogOpen,
        onOpenChange: setShareDialogOpen,
        url: shareDialogUrl,
        title: s("share") || "Share post",
      }),
    );
  };
var Nt = it;
export { Nt as default };
