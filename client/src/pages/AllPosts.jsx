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
  FaChevronLeft as Lo,
  FaChevronRight as Co,
  FaShoppingCart as Bo,
  FaCartPlus as Mo,
  FaTag as Vo,
  FaBolt as zo,
  FaClock as Ho,
  FaMapMarkerAlt as Uo,
  FaSyncAlt as Ko,
  FaTimes as Jo,
} from "react-icons/fa";
import { useNavigate as Je, useLocation as Ke } from "react-router-dom";
import { useFilter as We } from "@/context/FilterContext";
import { useTranslation as Xe } from "react-i18next";
import Ze from "@/components/BuyerInterestModal";
import {
  translatePosts as Re,
  translatePostsInstant as Ue,
} from "@/utils/translateContent";
import { useAuth as et } from "@/context/AuthContext";
import { useCart as mt } from "@/context/CartContext";
import A from "@/lib/api";
import { getUserId as tt, isAuthenticated as rt } from "@/utils/authStorage";
import { fetchCategoriesCached as at } from "@/services/categoriesService";
import {
  buildSavedPostsMap,
  extractSavedPostIds,
  getSavedPostsMap,
  replaceSavedPostIds,
  setSavedPostStatus,
  subscribeSavedPosts,
} from "@/utils/savedPosts";
import pt from "@/components/ShareLinkDialog";
import {
  normalizeMediaList as ctm,
  resolveMediaUrl as utm,
} from "@/lib/mediaUrl";
const ve = 5,
  SHOW_POST_ID_CHIP = !0,
  D = "/placeholder.svg",
  ALL_POSTS_TRANSLATE_PATHS = [
    "title",
    "description",
    "category",
    "category_name",
    "location",
    "city",
    "area",
    "state",
    "summary",
    "subtitle",
    "brand",
    "model",
    "user.name",
    "user.location",
  ],
  st = {
    search: "",
    category: "All",
    sortBy: "",
    latestWindow: "",
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
    if (typeof s === "object") {
      const candidate = s.post_id ?? s.postId ?? s.id;
      if (candidate != null) return String(candidate).trim();
    }
    const c = String(s).trim();
    return c.length ? c : "";
  },
  ot = (s) => {
    const c = Number(s);
    return Number.isFinite(c) ? c : s || 0;
  },
  relativeTimeFormatters = new Map(),
  getRelativeTimeFormatter = (s) => {
    const c = String(s || "en").trim().toLowerCase();
    const l = c || "en";
    if (relativeTimeFormatters.has(l)) {
      return relativeTimeFormatters.get(l);
    }
    if (typeof Intl > "u" || typeof Intl.RelativeTimeFormat > "u") {
      relativeTimeFormatters.set(l, null);
      return null;
    }
    try {
      const t = new Intl.RelativeTimeFormat(l, { numeric: "always" });
      return relativeTimeFormatters.set(l, t), t;
    } catch {
      const t = new Intl.RelativeTimeFormat("en", { numeric: "always" });
      return relativeTimeFormatters.set(l, t), t;
    }
  },
  nt = (s, c = "en") => {
    if (!s) return "";
    const l = new Date(s);
    if (Number.isNaN(l.getTime())) return "";
    const t = Date.now() - l.getTime(),
      m = Math.max(1, Math.floor(t / 6e4)),
      p = getRelativeTimeFormatter(c);
    if (p)
      return m < 60
        ? p.format(-m, "minute")
        : (() => {
            const F = Math.floor(m / 60);
            return F < 24
              ? p.format(-F, "hour")
              : p.format(-Math.floor(F / 24), "day");
          })();
    if (m < 60) return `${m}m ago`;
    const F = Math.floor(m / 60);
    return F < 24 ? `${F}h ago` : `${Math.floor(F / 24)}d ago`;
  },
  isDateOnlyValue = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")),
  normalizeLatestWindow = (s) => {
    const c = Number.parseInt(String(s || ""), 10);
    return c === 5 || c === 10 ? c : null;
  },
  toInclusiveEndDateValue = (s) =>
    isDateOnlyValue(s) ? `${s}T23:59:59.999` : s,
  collectPostImageUrls = (s) => {
    if (!s) return [D];
    const c = [];
    const l = (t) => {
      ctm(t).forEach((m) => {
        const p = utm(m, D);
        p && c.push(p);
      });
    };
    (l(s.images),
      l(s.image_urls),
      l(s.imageUrls),
      l(s.image_url),
      l(s.imageUrl),
      l(s.thumbnail));
    const t = Array.from(
      new Set(
        c
          .map((m) => String(m || "").trim())
          .filter((m) => !!m && m !== D),
      ),
    );
    return t.length ? t : [D];
  },
  Ne = (s) => {
    const c = collectPostImageUrls(s);
    return c[0] || D;
  },
  setNestedValue = (s, c, l) => {
    if (!s || typeof s != "object" || !c) return;
    const t = String(c).split(".");
    let m = s;
    for (let p = 0; p < t.length - 1; p += 1) {
      const F = t[p];
      (!m[F] || typeof m[F] != "object") && (m[F] = {});
      m = m[F];
    }
    m[t[t.length - 1]] = l;
  },
  restoreTranslatedPost = (s) => {
    if (!s || typeof s != "object") return s;
    const c = s._originalTranslations;
    if (!c || typeof c != "object") return s;
    const l = { ...s };
    return (
      Object.entries(c).forEach(([t, m]) => {
        setNestedValue(l, t, m);
      }),
      typeof s._originalTitle == "string" && (l.title = s._originalTitle),
      typeof s._originalDescription == "string" &&
        (l.description = s._originalDescription),
      l
    );
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
        latestWindow: e.get("latestWindow") || "",
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
      [savedPosts, setSavedPosts] = g(() => getSavedPostsMap()),
      [shareDialogOpen, setShareDialogOpen] = g(!1),
      [shareDialogUrl, setShareDialogUrl] = g(""),
      [carouselIndexByPost, setCarouselIndexByPost] = g({}),
      de = k({}),
      carouselTrackRefs = k({}),
      C = N(() => rt($), [$]);
    const {
      addItem: addCartItem,
      removeItem: removeCartItem,
      isInCart: isInCartItem,
    } = mt();
    const [isLiveSyncing, setIsLiveSyncing] = g(!1),
      [lastLiveSyncAt, setLastLiveSyncAt] = g(Date.now()),
      [navStickyTop, setNavStickyTop] = g(68);
    const languageRef = k(l);
    const formatCurrency = x(
      (e) => `\u20B9${ot(e).toLocaleString("en-IN")}`,
      [],
    );
    const tr = x(
      (key, fallback) => {
        const value = s(key);
        if (typeof value !== "string" || !value.trim() || value === key) {
          return fallback;
        }
        return value;
      },
      [s],
    );
    w(() => {
      languageRef.current = l;
    }, [l]);
    w(() => {
      if (!Array.isArray(f) || f.length === 0) return;
      let e = !1;
      if (!l || l === "en") {
        O((a) => (Array.isArray(a) ? a.map(restoreTranslatedPost) : a));
        return;
      }
      const a = Ue(f, l, { paths: ALL_POSTS_TRANSLATE_PATHS });
      O(a);
      Re(f, l, { paths: ALL_POSTS_TRANSLATE_PATHS })
        .then((o) => {
          if (e) return;
          Array.isArray(o) && o.length > 0 ? O(o) : O(a);
        })
        .catch(() => {
          if (!e) O(a);
        });
      return () => {
        e = !0;
      };
    }, [l]);
    (w(() => {
      const e = sessionStorage.getItem("allPostsScrollPosition");
      e &&
        f.length > 0 &&
        requestAnimationFrame(() => {
          (window.scrollTo(0, parseInt(e, 10)),
            sessionStorage.removeItem("allPostsScrollPosition"));
        });
    }, [f.length]),
      w(() => subscribeSavedPosts(setSavedPosts), []),
      w(() => {
        if (!C) return;
        let e = !1;
        (async () => {
          try {
            const a = tt($);
            const o = a
              ? await A.get("/wishlist", { params: { userId: a } })
              : await A.get("/wishlist");
            if (e) return;
            const n = extractSavedPostIds(o);
            replaceSavedPostIds(n);
            setSavedPosts(buildSavedPostsMap(n));
          } catch {
            // Keep the last known local saved state.
          }
        })();
        return () => {
          e = !0;
        };
      }, [C, $]),
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
    w(() => {
      if (typeof window > "u" || typeof document > "u") return;
      let e = null;
      const a = () => {
        const o = document.querySelector('nav[aria-label="main_navigation"]');
        const n = Math.ceil(o?.getBoundingClientRect().height || 68);
        setNavStickyTop(Math.max(56, n));
      };
      a();
      window.addEventListener("resize", a);
      const o = document.querySelector('nav[aria-label="main_navigation"]');
      if (o && typeof window.ResizeObserver < "u") {
        e = new window.ResizeObserver(a);
        e.observe(o);
      }
      return () => {
        window.removeEventListener("resize", a);
        e?.disconnect();
      };
    }, []);
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
      fallbackCategoryList = Object.keys(Le).map((e) => ({
        name: e,
        category_id: e,
      })),
      categoryList = h.length > 0 ? h : fallbackCategoryList,
      ce = N(
        () =>
          categoryList.reduce(
            (e, a) => ((e[a.name] = a.category_id || a.name), e),
            {},
          ),
        [categoryList],
      ),
      Q = N(
        () =>
          typeof window > "u"
            ? ""
            : localStorage.getItem("mhub_user_city") || "",
        [],
      ),
      latestWindow = N(
        () => normalizeLatestWindow(t.latestWindow),
        [t.latestWindow],
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
          e.latestWindow &&
            normalizeLatestWindow(e.latestWindow) &&
            a.set("latestWindow", String(normalizeLatestWindow(e.latestWindow))),
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
          b({ category: t.category === e ? "All" : e });
        },
        [b, t.category],
      ),
      Ee = x(() => {
        b({ category: "All" });
      }, [b]),
      jee = x(
        (e) => {
          const a = String(e);
          if (String(t.latestWindow || "") === a) {
            b({ latestWindow: "", sortBy: "" });
            return;
          }
          b({
            latestWindow: a,
            sortBy: "date_desc",
            startDate: "",
            endDate: "",
          });
        },
        [b, t.latestWindow],
      ),
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
          if (e === "latestWindow") {
            b({ latestWindow: "", sortBy: "" });
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
          !!latestWindow ||
          !!t.sortBy ||
          !!(t.category && t.category !== "All"),
        [
          t.category,
          t.endDate,
          latestWindow,
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
          t.search &&
            e.push({
              key: "search",
              label: `${s("search") || "Search"}: ${t.search}`,
            }),
          t.category &&
            t.category !== "All" &&
            e.push({
              key: "category",
              label: `${s("category") || "Category"}: ${t.category}`,
            }),
          t.location &&
            e.push({
              key: "location",
              label: `${s("location") || "Location"}: ${t.location}`,
            }),
          (t.minPrice || t.maxPrice) &&
            e.push({
              key: "price",
              label: `${s("price") || "Price"}: ${t.minPrice || "0"} - ${
                t.maxPrice || (s("any") || "any")
              }`,
            }),
          (t.startDate || t.endDate) &&
            e.push({
              key: "date",
              label: `${s("date") || "Date"}: ${
                t.startDate || (s("any") || "any")
              } ${s("to") || "to"} ${t.endDate || (s("any") || "any")}`,
            }),
          latestWindow &&
            e.push({
              key: "latestWindow",
              label: `${s("latest") || "Latest"}: ${latestWindow} ${
                s("posts") || "posts"
              }`,
            }),
          t.sortBy &&
            e.push({
              key: "sortBy",
              label: `${s("sort_by") || "Sort by"}: ${t.sortBy}`,
            }),
          e
        );
      }, [
        s,
        t.category,
        t.endDate,
        latestWindow,
        t.location,
        t.maxPrice,
        t.minPrice,
        t.search,
        t.sortBy,
        t.startDate,
      ]),
      requestLimit = latestWindow || q,
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
          latestWindow &&
            e.append("latestWindow", String(latestWindow)),
          (t.sortBy || latestWindow) &&
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
                    : latestWindow
                      ? (e.append("sortBy", "created_at"),
                        e.append("sortOrder", "desc"))
                    : (e.append("sortBy", t.sortBy),
                      e.append("sortOrder", "desc"))),
          e.append("page", L),
          e.append("limit", requestLimit),
          e
        );
      }, [
        h,
        ce,
        L,
        latestWindow,
        requestLimit,
        t.category,
        t.endDate,
        t.location,
        t.maxPrice,
        t.minPrice,
        t.priceRange,
        t.search,
        t.sortBy,
        t.startDate,
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
            const p = Array.isArray(i.posts) ? i.posts : [];
            const F = latestWindow
              ? p.slice(0, latestWindow)
              : p;
            const activeLanguage = languageRef.current;
            const translatedSeed =
              activeLanguage && activeLanguage !== "en" && F.length > 0
                ? Ue(F, activeLanguage, {
                    paths: ALL_POSTS_TRANSLATE_PATHS,
                  })
                : F;
            const safeTranslatedSeed = Array.isArray(translatedSeed)
              ? translatedSeed
              : F;
            (O(L === 1 ? safeTranslatedSeed : (d) => lt(d, safeTranslatedSeed)),
              z(null));
            const _ = {},
              Vt = {};
            (safeTranslatedSeed.forEach((d) => {
              ((_[d.post_id || d.id] = d.likes || 0),
                (Vt[d.post_id || d.id] = d.views_count || d.views || 0));
            }),
              se((d) => ({ ...d, ..._ })),
              oe((d) => ({ ...d, ...Vt })),
              ee(latestWindow ? !1 : p.length === requestLimit),
              setLastLiveSyncAt(Date.now()));
            if (activeLanguage && activeLanguage !== "en" && F.length > 0) {
              Re(F, activeLanguage, {
                paths: ALL_POSTS_TRANSLATE_PATHS,
              })
                .then((d) => {
                  if (e !== P.current || !Array.isArray(d) || d.length === 0) {
                    return;
                  }
                  const _t = new Map();
                  d.forEach((me) => {
                    const ge = ke(me);
                    ge !== null && _t.set(String(ge), me);
                  });
                  O((me) =>
                    Array.isArray(me)
                      ? me.map((ge) => {
                          const Le = ke(ge);
                          if (Le === null) return ge;
                          return _t.get(String(Le)) || ge;
                        })
                      : me,
                  );
                })
                .catch(() => {});
            }
          } catch (n) {
            if (n?.name === "AbortError" || e !== P.current) return;
            (z(n.message || "Failed to fetch posts"), O([]), ee(!1));
          } finally {
            (v.current === a && (v.current = null),
              e === P.current && (R(!1), setIsLiveSyncing(!1)));
          }
        })(),
        () => {
          (a.abort(), v.current === a && (v.current = null));
        }
      );
    }, [be, L, Pe]),
      w(() => {
        if (!Array.isArray(f) || f.length === 0) return;
        let e = !1;
        if (!l || l === "en") {
          O((a) => (Array.isArray(a) ? a.map(restoreTranslatedPost) : a));
          return;
        }
        const translatedSeed = Ue(f, l, {
          paths: ALL_POSTS_TRANSLATE_PATHS,
        });
        const safeTranslatedSeed = Array.isArray(translatedSeed)
          ? translatedSeed
          : f;
        const n = new Map();
        safeTranslatedSeed.forEach((i) => {
          const p = ke(i);
          p !== null && n.set(String(p), i);
        });
        O((i) =>
          Array.isArray(i)
            ? i.map((p) => {
                const F = ke(p);
                if (F === null) return p;
                return n.get(String(F)) || p;
              })
            : i,
        );
        Re(f, l, {
          paths: ALL_POSTS_TRANSLATE_PATHS,
        })
          .then((a) => {
            if (e || !Array.isArray(a) || a.length === 0) return;
            const o = new Map();
            a.forEach((n) => {
              const i = ke(n);
              i !== null && o.set(String(i), n);
            });
            O((n) =>
              Array.isArray(n)
                ? n.map((i) => {
                    const p = ke(i);
                    if (p === null) return i;
                    return o.get(String(p)) || i;
                  })
                : n,
            );
          })
          .catch(() => {});
        return () => {
          e = !0;
        };
      }, [l]),
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
        t.latestWindow,
        t.sortBy,
      ]));
    const J = x(() => {
      E || !H || latestWindow || T((e) => e + 1);
    }, [E, H, latestWindow]);
    w(() => {
      const e = () => {
        if (latestWindow) return;
        C &&
          window.innerHeight + document.documentElement.scrollTop >=
            document.documentElement.offsetHeight - 1e3 &&
          J();
      };
      return (
        window.addEventListener("scroll", e, { passive: !0 }),
        () => window.removeEventListener("scroll", e)
      );
    }, [J, C, latestWindow]);
    w(() => {
      if (latestWindow) return;
      const e = setInterval(() => {
        if (typeof document > "u" || document.hidden || E) return;
        Ce((a) => a + 1);
      }, 3e4);
      return () => clearInterval(e);
    }, [E, latestWindow]);
    const K = N(
        () =>
          !f || f.length === 0
            ? []
            : latestWindow
              ? f.slice(0, latestWindow)
              : C
                ? f
                : f.slice(0, ve),
        [f, C, latestWindow],
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
      }, []),
      setCarouselTrackRef = x((e, a) => {
        const o = I(e);
        if (!o) return;
        if (!a) {
          delete carouselTrackRefs.current[o];
          return;
        }
        carouselTrackRefs.current[o] = a;
      }, []),
      updateCarouselIndex = x((e, a) => {
        const o = I(e);
        if (!o) return;
        setCarouselIndexByPost((n) =>
          n[o] === a ? n : { ...n, [o]: a },
        );
      }, []),
      getCarouselIndex = x(
        (e, a) => {
          const o = I(e);
          if (!o || !a || a <= 0) return 0;
          const n = Number(carouselIndexByPost[o] ?? 0);
          if (!Number.isFinite(n) || n < 0) return 0;
          if (n >= a) return a - 1;
          return n;
        },
        [carouselIndexByPost],
      ),
      scrollCarouselToIndex = x(
        (e, a, o) => {
          const n = I(e);
          if (!n || !o || o <= 0) return;
          const i = carouselTrackRefs.current[n];
          if (!i) return;
          const p = ((a % o) + o) % o;
          i.scrollTo({ left: i.clientWidth * p, behavior: "smooth" });
          updateCarouselIndex(n, p);
        },
        [updateCarouselIndex],
      ),
      moveCarousel = x(
        (e, a, o, n) => {
          if (o <= 1) return;
          n.preventDefault();
          n.stopPropagation();
          const i = getCarouselIndex(e, o);
          scrollCarouselToIndex(e, i + a, o);
        },
        [getCarouselIndex, scrollCarouselToIndex],
      ),
      handleCarouselScroll = x(
        (e, a, o) => {
          if (o <= 1) return;
          const n = a.currentTarget;
          const i = n.clientWidth || 1;
          const p = Math.round(n.scrollLeft / i);
          updateCarouselIndex(e, Math.max(0, Math.min(o - 1, p)));
        },
        [updateCarouselIndex],
      );
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
        const o = !!savedPosts[a],
          n = !o;
        (setSavedPosts((i) => ({ ...i, [a]: n })), setSavedPostStatus(a, n));
        try {
          n
            ? await A.post("/wishlist", { postId: a })
            : await A.delete(`/wishlist/${a}`);
        } catch {
          (setSavedPosts((n) => ({ ...n, [a]: o })),
            setSavedPostStatus(a, o),
            M(o ? "Failed to remove saved post" : "Failed to save post"),
            setTimeout(() => M(""), 2e3));
        }
      },
      handleCartToggle = x(
        (e) => {
          const a = I(e?.post_id || e?.id);
          if (!a) return;
          if (isInCartItem(a)) {
            removeCartItem(a);
            M(s("removed") || "Removed from cart");
          } else {
            addCartItem({
              id: a,
              title: e?.title || s("title") || "Item",
              price: e?.price || 0,
              image: Ne(e),
              seller:
                e?.user?.name || e?.user_name || e?.username || "Unknown",
              location: e?.location || e?.city || e?.area || "",
            });
            M(s("add_to_cart") || "Added to cart");
          }
          setTimeout(() => M(""), 2e3);
        },
        [addCartItem, isInCartItem, removeCartItem, s],
      ),
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
        setIsLiveSyncing(!0);
        Ce((e) => e + 1);
      }, []);
    return r.createElement(
      "div",
      {
        className:
          "bg-gradient-to-b from-blue-50/40 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 min-h-screen transition-colors duration-300 pb-24",
      },
      r.createElement(
        "div",
        {
          className:
            "w-full sticky z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-blue-100/70 dark:border-gray-800",
          style: { top: `${navStickyTop}px` },
        },
        r.createElement(
          "div",
          { className: "w-full flex justify-center px-4 pt-2 pb-2" },
          r.createElement(
            "div",
            {
              className:
                "flex gap-1 md:gap-2 bg-gradient-to-r from-blue-50 via-white to-blue-50 dark:from-slate-900/40 dark:via-slate-900/30 dark:to-slate-900/40 rounded-2xl shadow-sm py-1 md:py-2 px-2 md:px-4 items-center overflow-x-auto scrollbar-hide max-w-[92rem] w-full border border-blue-100/60 dark:border-slate-800/60",
            },
            r.createElement(
              "button",
              {
                onClick: Ee,
                className: `flex flex-col items-center cursor-pointer hover:scale-[1.03] transition px-2 py-1 rounded-lg min-w-[50px] sm:min-w-[56px] ${j === "All" ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400" : ""}`,
              },
              r.createElement(
                "span",
                { className: "text-lg sm:text-xl md:text-2xl mb-0.5" },
                "\u{1F4E6}",
              ),
              r.createElement(
                "span",
                {
                  className: `font-semibold text-[10px] sm:text-xs md:text-sm ${j === "All" ? "text-white" : "text-gray-700 dark:text-gray-300"}`,
                },
                s("all"),
              ),
            ),
            categoryList.map((e) =>
              r.createElement(
                "button",
                {
                  key: e.category_id || e.name,
                  onClick: () => $e(e.name),
                  className: `flex flex-col items-center cursor-pointer hover:scale-[1.03] transition px-2 py-1 rounded-lg min-w-[54px] sm:min-w-[64px] whitespace-nowrap ${j === e.name ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400" : ""}`,
                },
                r.createElement(
                  "span",
                  { className: "text-lg sm:text-xl md:text-2xl mb-0.5" },
                  Le[e.name] || "\u{1F4E6}",
                ),
                r.createElement(
                  "span",
                  {
                    className: `font-semibold text-[10px] sm:text-xs md:text-sm ${j === e.name ? "text-white" : "text-gray-700 dark:text-gray-300"}`,
                  },
                  s(e.name.toLowerCase().replace(" ", "_")) || e.name,
                ),
              ),
            ),
          ),
        ),
        r.createElement(
          "div",
          { className: "w-full flex justify-center px-3 pb-2.5" },
          r.createElement(
            "div",
          {
            className:
              "w-full max-w-[92rem] bg-white/95 dark:bg-slate-900/40 border border-blue-100/70 dark:border-slate-800/60 rounded-2xl p-2 sm:p-3.5 shadow-sm backdrop-blur-sm",
          },
          r.createElement(
            "div",
            { className: "flex flex-col gap-2 sm:gap-3" },
            r.createElement(
              "div",
              { className: "flex items-center justify-between gap-3" },
              r.createElement(
                "div",
                {
                  className:
                    "inline-flex items-center gap-2 text-[11px] sm:text-sm font-semibold text-blue-800 dark:text-blue-200",
                },
                r.createElement(zo, { className: "w-3.5 h-3.5" }),
                tr("quick_filters", "Quick filters"),
              ),
              r.createElement(
                "span",
                {
                  className:
                    "hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-2.5 py-1 text-[11px] md:text-xs text-blue-700 dark:text-blue-300",
                },
                r.createElement(Ko, { className: "w-3 h-3" }),
                `${tr("auto_refresh", "Auto refresh")}: 30s`,
              ),
            ),
            r.createElement(
              "div",
              { className: "flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1" },
              r.createElement(
                u,
                {
                  type: "button",
                  variant: "outline",
                  className:
                    "h-8 sm:h-9 rounded-full border-blue-200 bg-white text-blue-700 hover:bg-blue-50 inline-flex items-center gap-1 shrink-0 px-2 sm:px-2.5 text-[10px] sm:text-xs",
                  onClick: () => b({ minPrice: "", maxPrice: "1000" }),
                },
                r.createElement(Vo, { className: "w-3.5 h-3.5" }),
                tr("under_1000", "Under 1000"),
              ),
              r.createElement(
                u,
                {
                  type: "button",
                  variant: "outline",
                  className:
                    "h-8 sm:h-9 rounded-full border-blue-200 bg-white text-blue-700 hover:bg-blue-50 inline-flex items-center gap-1 shrink-0 px-2 sm:px-2.5 text-[10px] sm:text-xs",
                  onClick: () => b({ minPrice: "1000", maxPrice: "5000" }),
                },
                r.createElement(Vo, { className: "w-3.5 h-3.5" }),
                "1000-5000",
              ),
              r.createElement(
                u,
                {
                  type: "button",
                  variant: "outline",
                  className: `h-8 sm:h-9 rounded-full border-blue-200 inline-flex items-center gap-1 shrink-0 px-2 sm:px-2.5 text-[10px] sm:text-xs ${latestWindow === 5 ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" : "bg-white text-blue-700 hover:bg-blue-50"}`,
                  onClick: () => jee(5),
                },
                r.createElement(Ho, { className: "w-3.5 h-3.5" }),
                tr("latest_5", "Latest 5"),
              ),
              r.createElement(
                u,
                {
                  type: "button",
                  variant: "outline",
                  className: `h-8 sm:h-9 rounded-full border-blue-200 inline-flex items-center gap-1 shrink-0 px-2 sm:px-2.5 text-[10px] sm:text-xs ${latestWindow === 10 ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" : "bg-white text-blue-700 hover:bg-blue-50"}`,
                  onClick: () => jee(10),
                },
                r.createElement(Ho, { className: "w-3.5 h-3.5" }),
                tr("latest_10", "Latest 10"),
              ),
              r.createElement(
                u,
                {
                  type: "button",
                  variant: "outline",
                  className:
                    "h-8 sm:h-9 rounded-full border-blue-200 bg-white text-blue-700 hover:bg-blue-50 inline-flex items-center gap-1 shrink-0 px-2 sm:px-2.5 text-[10px] sm:text-xs",
                  onClick: () =>
                    b({ startDate: ye, endDate: ye, latestWindow: "" }),
                },
                r.createElement(zo, { className: "w-3.5 h-3.5" }),
                tr("posted_today", "Posted Today"),
              ),
              Q &&
                r.createElement(
                  u,
                  {
                    type: "button",
                    variant: "outline",
                    className:
                      "h-8 sm:h-9 rounded-full border-blue-200 bg-white text-blue-700 hover:bg-blue-50 inline-flex items-center gap-1 shrink-0 px-2 sm:px-2.5 text-[10px] sm:text-xs",
                    onClick: () => b({ location: Q }),
                  },
                  r.createElement(Uo, { className: "w-3.5 h-3.5" }),
                  `${tr("near", "Near")} `,
                  Q,
                ),
              ue &&
                r.createElement(
                  u,
                  {
                    type: "button",
                    variant: "ghost",
                    className:
                      "h-8 sm:h-9 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 inline-flex items-center gap-1 shrink-0 px-2 sm:px-2.5 text-[10px] sm:text-xs",
                    onClick: Y,
                  },
                  r.createElement(Jo, { className: "w-3.5 h-3.5" }),
                  tr("clear_all_filters", "Clear all filters"),
                ),
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
                    title: tr("remove_filter", "Remove filter"),
                  },
                  r.createElement("span", null, e.label),
                  r.createElement(Jo, { className: "w-3 h-3 font-semibold" }),
                ),
              ),
            ),
        ),
      ),
      ),
      r.createElement("div", { className: "h-2 md:h-3" }),
      r.createElement(
        "div",
        { className: "w-full flex justify-center" },
        r.createElement(
          "div",
          {
            className:
              "w-full max-w-[92rem] mb-4 md:mb-5 mt-0 md:mt-2",
          },
          r.createElement(
            "div",
            {
              className:
                "sm:hidden flex items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-blue-100/80 px-3 py-2 shadow-sm",
            },
            r.createElement(
              "div",
              { className: "flex flex-col gap-1" },
              r.createElement(
                "span",
                { className: "text-sm font-semibold text-blue-900" },
                s("great_deals"),
              ),
              r.createElement(
                "span",
                { className: "text-[11px] text-blue-700" },
                s("up_to_off"),
              ),
            ),
            r.createElement(
              u,
              {
                className:
                  "bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-full text-[11px] inline-flex items-center gap-1.5",
                onClick: () => {
                  const e = document.getElementById("all-posts-feed");
                  e?.scrollIntoView({ behavior: "smooth", block: "start" });
                },
              },
              r.createElement(zo, { className: "w-3.5 h-3.5" }),
              s("shop_now"),
            ),
          ),
          r.createElement(
            "div",
            {
              className:
                "hidden sm:flex flex-col md:flex-row items-center justify-between px-3 md:px-6 lg:px-7 py-3 md:py-4 lg:py-5 bg-blue-100/80 dark:bg-slate-900/45 rounded-2xl shadow-md w-full relative overflow-hidden border border-blue-200/70 dark:border-slate-800/60",
            },
            r.createElement(
              "div",
              { className: "flex flex-col gap-2 z-10 w-full md:w-auto" },
              r.createElement(
                "span",
                {
                  className:
                    "text-base sm:text-lg md:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1",
                },
                s("great_deals"),
              ),
              r.createElement(
                "span",
                {
                  className:
                    "text-[11px] sm:text-sm md:text-base text-blue-800 dark:text-blue-200 font-medium mb-1.5",
                },
                s("up_to_off"),
              ),
              r.createElement(
                u,
                {
                  className:
                    "bg-blue-600 text-white font-semibold px-3 md:px-5 py-1.5 md:py-2 rounded-lg shadow hover:bg-blue-700 transition w-fit text-[11px] sm:text-sm md:text-base inline-flex items-center gap-1.5",
                  onClick: () => {
                    const e = document.getElementById("all-posts-feed");
                    e?.scrollIntoView({ behavior: "smooth", block: "start" });
                  },
                },
                r.createElement(zo, { className: "w-3.5 h-3.5" }),
                s("shop_now"),
              ),
            ),
            r.createElement(
              "div",
              { className: "hidden sm:block mt-3 md:mt-0 md:ml-6 z-10" },
              r.createElement(
                "div",
                {
                  className:
                    "w-16 h-12 sm:w-20 sm:h-14 md:w-28 md:h-20 bg-blue-200/80 dark:bg-blue-800/60 rounded-lg flex items-center justify-center",
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
                "absolute right-0 bottom-0 opacity-10 w-24 h-20 md:w-32 md:h-24 bg-blue-300 dark:bg-blue-700 rounded-bl-2xl",
            }),
          ),
        ),
      ),
      pe.length > 0 &&
        r.createElement(
        "div",
        { className: "w-full flex flex-col items-center mb-6" },
        r.createElement(
          "h2",
          {
            className:
              "text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4 w-full max-w-[92rem] px-3 md:px-0",
          },
          s("sponsored_deals"),
        ),
        r.createElement(
          "div",
          {
            className:
              "flex gap-4 md:gap-6 w-full max-w-[92rem] overflow-x-auto scrollbar-hide px-3 md:px-0 snap-x snap-mandatory",
          },
          pe.map((e, a) =>
                r.createElement(
                  S,
                  {
                    key: e.id || e._id || a,
                    className:
                      "rounded-xl shadow bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex flex-col items-center p-3 md:p-4 min-w-[160px] max-w-[180px] md:min-w-[220px] md:max-w-[240px] hover:scale-[1.02] transition-transform duration-200 snap-start",
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
        { id: "all-posts-feed", className: "w-full flex flex-col items-center mb-8" },
        r.createElement(
          "div",
          {
            className:
              "w-full max-w-[92rem] px-3 md:px-0 mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-3",
          },
          r.createElement(
            "div",
            null,
            r.createElement(
              "h2",
              {
                className:
                  "text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-200 mb-1",
              },
              s("all_posts"),
            ),
          ),
          r.createElement(
            "div",
            { className: "flex items-center gap-2.5" },
            r.createElement(
              "span",
              {
                className:
                  "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] sm:text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
              },
              r.createElement("span", {
                className:
                  "h-2 w-2 rounded-full bg-emerald-500 animate-pulse",
              }),
              s("live") || "Live",
            ),
            r.createElement(
              "span",
              {
                className:
                  "text-xs md:text-sm text-gray-500 dark:text-gray-400",
              },
              `${s("updated") || "Updated"} `,
              nt(lastLiveSyncAt, l),
            ),
            r.createElement(
              u,
              {
                type: "button",
                variant: "outline",
                className:
                  "h-8 sm:h-9 rounded-full border-blue-200 text-blue-700 hover:bg-blue-50 inline-flex items-center gap-1.5 text-[10px] sm:text-xs px-2.5 sm:px-3",
                onClick: Fe,
                disabled: E || isLiveSyncing,
              },
              r.createElement(Ko, {
                className: `w-3.5 h-3.5 ${E || isLiveSyncing ? "animate-spin" : ""}`,
              }),
              r.createElement(
                "span",
                { className: "hidden sm:inline" },
                s("refresh") || "Refresh",
              ),
            ),
          ),
        ),
        r.createElement(
          "div",
          {
            className:
              "w-full max-w-[92rem] mx-auto px-2 md:px-0",
          },
          r.createElement(
            "div",
            {
              className: "order-1 flex flex-col gap-6 w-full min-w-0",
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
                      he = nt(e.created_at || e.createdAt, l),
                      we = e.location || e.city || e.area || "",
                      imageList = collectPostImageUrls(e),
                      activeImageIndex = getCarouselIndex(a, imageList.length),
                      inCart = isInCartItem(a);
                    return r.createElement(
                      S,
                      {
                        key: a,
                        ref: (X) => {
                          de.current[a] = X;
                        },
                        "data-post-id": a,
                        className:
                          "rounded-2xl shadow bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 flex flex-col p-0 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300",
                      },
                      r.createElement(
                        "div",
                        {
                          className:
                            "px-3 pt-2.5 pb-2 border-b border-gray-100 dark:border-gray-700/70 sm:px-4",
                        },
                        r.createElement(
                          "div",
                          {
                            className:
                              "inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-2.5 py-1 sm:px-3 sm:py-1.5",
                          },
                          r.createElement(
                            "span",
                            {
                              className:
                                "text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-300",
                            },
                            s("price") || "Price",
                          ),
                          r.createElement(
                            "span",
                            {
                              className:
                                "text-sm sm:text-base font-bold text-emerald-800 dark:text-emerald-200",
                            },
                            formatCurrency(e.price),
                          ),
                        ),
                      ),
                      r.createElement(
                        "div",
                        {
                          className:
                            "flex items-start gap-3 px-3 pt-3 pb-3 relative sm:px-4",
                        },
                        r.createElement(
                          Ve,
                          { className: "w-9 h-9 sm:w-10 sm:h-10" },
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
                                  "font-semibold text-blue-900 dark:text-blue-200 text-sm sm:text-base md:text-lg truncate",
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
                                    "text-yellow-500 text-[10px] sm:text-xs font-medium",
                                },
                                "\u2605 ",
                                i.toFixed(1),
                              ),
                          ),
                          r.createElement(
                            "div",
                            {
                              className:
                                "mt-1 flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400",
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
                                `${s("posted") || "Posted"} `,
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
                                    "hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 font-semibold text-gray-600 dark:text-gray-200",
                                },
                                `${s("post_id") || "Post ID"}: `,
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
                              "absolute right-3 top-3 p-1.5 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 sm:right-4 sm:top-4 sm:p-2",
                            title: tr("more_options", "More options"),
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
                                  (M(
                                    s("report_feature_coming_soon") ||
                                      "Report feature coming soon",
                                  ),
                                    setTimeout(() => M(""), 2e3),
                                    setMenuPostId(null));
                                },
                                className:
                                  "w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg",
                              },
                              s("report") || "Report",
                            ),
                          ),
                      ),
                      r.createElement(
                        "div",
                        {
                          className:
                            "relative w-full bg-slate-100 dark:bg-slate-900/70 border-y border-slate-200/70 dark:border-slate-700",
                        },
                        r.createElement(
                          "div",
                          {
                            ref: (X) => setCarouselTrackRef(a, X),
                            onScroll: (X) =>
                              handleCarouselScroll(a, X, imageList.length),
                            className:
                              "flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide",
                          },
                          imageList.map((X, _t) =>
                            r.createElement(
                              "div",
                              {
                                key: `${a}-media-${_t}`,
                                className:
                                  "w-full shrink-0 snap-center bg-slate-100 dark:bg-slate-800",
                              },
                              r.createElement("img", {
                                src: X,
                                alt: `${e.title || (s("post") || "Post")} ${s("image") || "image"} ${_t + 1}`,
                                loading: "lazy",
                                className:
                                  "w-full h-[200px] sm:h-[260px] md:h-[340px] object-cover object-center",
                                onError: (Nt) => {
                                  Nt.currentTarget.src = D;
                                },
                              }),
                            ),
                          ),
                        ),
                        imageList.length > 1 &&
                          r.createElement(
                            r.Fragment,
                            null,
                            r.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: (X) =>
                                  moveCarousel(a, -1, imageList.length, X),
                                className:
                                  "absolute left-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/45 text-white hover:bg-black/60 flex items-center justify-center sm:h-8 sm:w-8",
                                "aria-label":
                                  s("previous_image") || "Previous image",
                              },
                              r.createElement(Lo, { className: "w-3 h-3" }),
                            ),
                            r.createElement(
                              "button",
                              {
                                type: "button",
                                onClick: (X) =>
                                  moveCarousel(a, 1, imageList.length, X),
                                className:
                                  "absolute right-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-black/45 text-white hover:bg-black/60 flex items-center justify-center sm:h-8 sm:w-8",
                                "aria-label": s("next_image") || "Next image",
                              },
                              r.createElement(Co, { className: "w-3 h-3" }),
                            ),
                            r.createElement(
                              "div",
                              {
                                className:
                                  "absolute top-3 right-3 px-2 py-1 rounded-full bg-black/55 text-white text-[11px] font-medium",
                              },
                              activeImageIndex + 1,
                              "/",
                              imageList.length,
                            ),
                            r.createElement(
                              "div",
                              {
                                className:
                                  "absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full",
                              },
                              imageList.map((X, _t) =>
                                r.createElement("button", {
                                  key: `${a}-dot-${_t}`,
                                  type: "button",
                                  onClick: (Nt) => {
                                    Nt.preventDefault();
                                    Nt.stopPropagation();
                                    scrollCarouselToIndex(a, _t, imageList.length);
                                  },
                                  className: `h-1.5 w-1.5 rounded-full transition-all ${_t === activeImageIndex ? "bg-white w-3" : "bg-white/50"}`,
                                  "aria-label": `${s("go_to_image") || "Go to image"} ${_t + 1}`,
                                }),
                              ),
                            ),
                          ),
                      ),
                      r.createElement(
                        "div",
                        {
                          className:
                            "px-3 py-2.5 text-gray-800 dark:text-gray-200 text-xs sm:text-sm md:text-base leading-relaxed sm:px-4 sm:py-3.5",
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
                            "px-3 pb-2.5 pt-2 border-t border-gray-100 dark:border-gray-700 sm:pb-3",
                        },
                        r.createElement(
                          "div",
                          {
                            className:
                              "flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap pr-1 scrollbar-hide sm:gap-2",
                          },
                          r.createElement(
                            "button",
                            {
                                  className:
                                    "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none",
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
                            r.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              s("like") || "Like",
                            ),
                            r.createElement(
                              "span",
                              { className: "text-[10px] sm:text-xs" },
                              Ae[a] || 0,
                            ),
                          ),
                          r.createElement(
                            "button",
                            {
                                  className:
                                    "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none",
                              onClick: () => Ue(a),
                            },
                            r.createElement(Ge, { className: "w-4 h-4" }),
                            r.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              s("share") || "Share",
                            ),
                          ),
                          r.createElement(
                            "button",
                            {
                                  className:
                                    "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-gray-50 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none",
                              onClick: () => toggleSave(a),
                            },
                            savedPosts[a]
                              ? r.createElement(Po, {
                                  className: "w-4 h-4 text-blue-600",
                                })
                              : r.createElement(Ro, { className: "w-4 h-4" }),
                            r.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              savedPosts[a]
                                ? s("saved") || "Saved"
                                : s("save") || "Save",
                            ),
                          ),
                          r.createElement(
                            "button",
                            {
                                  className:
                                    "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold focus:outline-none hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
                              onClick: () => {
                                (ie(e), le(!0));
                              },
                            },
                            r.createElement(Ye, { className: "w-4 h-4" }),
                            r.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              s("interested") || "Interested",
                            ),
                          ),
                          r.createElement(
                            "span",
                            {
                                  className:
                                    "shrink-0 inline-flex h-7 items-center gap-1.5 px-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-semibold",
                            },
                            r.createElement(Qe, { className: "w-4 h-4" }),
                            De[a] || 0,
                          ),
                          r.createElement(
                            u,
                            {
                              variant: "outline",
                              className: `shrink-0 h-7 px-2 text-[10px] sm:h-8 sm:px-2.5 sm:text-xs font-medium rounded inline-flex items-center justify-center gap-1 ${inCart ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : "border-blue-200 text-blue-700 hover:bg-blue-50"}`,
                              onClick: () => handleCartToggle(e),
                            },
                            inCart
                              ? r.createElement(Bo, { className: "w-4 h-4" })
                              : r.createElement(Mo, { className: "w-4 h-4" }),
                            r.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              inCart
                                ? s("in_cart") || "In Cart"
                                : s("add_to_cart") || "Add to Cart",
                            ),
                          ),
                          r.createElement(
                            u,
                            {
                              className:
                                "shrink-0 h-7 bg-blue-600 text-white px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs font-medium rounded hover:bg-blue-700",
                              onClick: () => je(a),
                            },
                            r.createElement(Qe, { className: "w-4 h-4" }),
                            r.createElement(
                              "span",
                              { className: "hidden sm:inline" },
                              s("view_details") || "View Details",
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
          ),
        ),
        C &&
          H &&
          !latestWindow &&
          !E &&
          !V &&
          K.length > 0 &&
          r.createElement(
            u,
            {
              type: "button",
              variant: "outline",
              className:
                "mt-5 border-blue-300 text-blue-700 inline-flex items-center gap-1.5",
              onClick: J,
            },
            r.createElement(zo, { className: "w-3.5 h-3.5" }),
            s("load_more_posts") || "Load more posts",
          ),
        !C &&
          f.length > ve &&
          r.createElement(
            S,
            {
              className:
                "w-full max-w-[92rem] mt-6 p-5 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",
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
                  className:
                    "bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-1.5",
                  onClick: () => y("/login"),
                },
                r.createElement(zo, { className: "w-3.5 h-3.5" }),
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
    ));
  };
var Nt = it;
export { Nt as default };

