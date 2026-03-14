import e, {
  useEffect as A,
  useMemo as F,
  useRef as M,
  useState as i,
} from "react";
import { useNavigate as D } from "react-router-dom";
import {
  Search as T,
  Filter as E,
  MapPin as G,
  Phone as O,
  Heart as j,
  RotateCcw as V,
} from "lucide-react";
import { useTranslation as _ } from "react-i18next";
import {
  PageEmptyState as K,
  PageErrorState as I,
  PageLoadingState as U,
} from "@/components/page-state/PageStateBlocks";
const $ = [
    {
      id: 1,
      title: "iPhone 13 Pro Max 128GB",
      brand: "Apple",
      price: "Rs 75,000",
      condition: "Like New",
      location: "Mumbai, Maharashtra",
      seller: "John Doe",
      verified: !0,
      image: "/placeholder.svg",
      postedDate: "2 days ago",
    },
    {
      id: 2,
      title: "Samsung Galaxy S21 256GB",
      brand: "Samsung",
      price: "Rs 45,000",
      condition: "Excellent",
      location: "Delhi, NCR",
      seller: "Sarah Khan",
      verified: !0,
      image: "/placeholder.svg",
      postedDate: "1 week ago",
    },
    {
      id: 3,
      title: "OnePlus 9 Pro 128GB",
      brand: "OnePlus",
      price: "Rs 35,000",
      condition: "Good",
      location: "Bangalore, Karnataka",
      seller: "Mike Wilson",
      verified: !1,
      image: "/placeholder.svg",
      postedDate: "3 days ago",
    },
  ],
  q = ["Apple", "Samsung", "OnePlus", "Xiaomi", "Oppo", "Vivo", "Realme"],
  H = (r) => Number(String(r || "").replace(/[^\d]/g, "")) || 0,
  J = (r, a) =>
    a
      ? a === "0-25000"
        ? r <= 25e3
        : a === "25000-50000"
          ? r > 25e3 &&
            r <= 5e4
          : a === "50000-75000"
            ? r > 5e4 &&
              r <= 75e3
            : a === "75000+"
              ? r > 75e3
              : !0
      : !0,
  Q = () => {
    const { t: r } = _(),
      tr = (key, fallback) => r(key, { defaultValue: fallback }),
      a = D(),
      [d, b] = i(""),
      [n, f] = i(""),
      [c, h] = i(""),
      [m, N] = i(!0),
      [u, x] = i(""),
      [y, w] = i([]),
      [g, S] = i({}),
      o = M(null),
      p = !!(d.trim() || n || c),
      C = () => {
        N(!0),
          x(""),
          o.current && clearTimeout(o.current),
          (o.current = setTimeout(() => {
            try {
              w($);
            } catch {
              x(
                tr(
                  "buyer_listings_retry_desc",
                  "Unable to load buyer listings right now. Please retry.",
                ),
              ),
                w([]);
            } finally {
              N(!1), (o.current = null);
            }
          }, 350));
      };
    A(
      () => (
        C(),
        () => {
          o.current && clearTimeout(o.current);
        }
      ),
      [],
    );
    const l = F(() => {
        const t = d.trim().toLowerCase();
        return y.filter((s) => {
          const P = H(s.price),
            B =
              !t ||
              s.title.toLowerCase().includes(t) ||
              s.seller.toLowerCase().includes(t) ||
              s.location.toLowerCase().includes(t),
            L = !n || s.brand === n;
          return B && L && J(P, c);
        });
      }, [y, c, d, n]),
      v = () => {
        b(""), f(""), h("");
      },
      k = (t) => {
        S((s) => ({ ...s, [t]: !s[t] }));
      };
    return e.createElement(
      "div",
      { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 main-content" },
      e.createElement(
        "div",
        { className: "mb-8" },
        e.createElement(
          "h1",
          { className: "text-3xl font-bold text-gray-900 mb-4" },
          tr("browse_phones", "Browse Mobile Phones"),
        ),
        e.createElement(
          "p",
          { className: "text-gray-600" },
          tr(
            "buyer_view_subtitle",
            "Find your perfect mobile phone from verified sellers.",
          ),
        ),
      ),
      e.createElement(
        "div",
        { className: "card mb-8" },
        e.createElement(
          "div",
          { className: "grid grid-cols-1 md:grid-cols-4 gap-4" },
          e.createElement(
            "div",
            { className: "relative" },
            e.createElement(T, {
              className:
                "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4",
            }),
            e.createElement("input", {
              type: "text",
              placeholder: tr(
                "search_mobiles_placeholder",
                "Search mobiles...",
              ),
              className: "input pl-10",
              value: d,
              onChange: (t) => b(t.target.value),
              "aria-label": tr(
                "search_buyer_listings_aria",
                "Search buyer listings",
              ),
            }),
          ),
          e.createElement(
            "select",
            {
              className: "input",
              value: n,
              onChange: (t) => f(t.target.value),
              "aria-label": tr("filter_by_brand_aria", "Filter by brand"),
            },
            e.createElement(
              "option",
              { value: "" },
              tr("all_brands", "All Brands"),
            ),
            q.map((t) => e.createElement("option", { key: t, value: t }, t)),
          ),
          e.createElement(
            "select",
            {
              className: "input",
              value: c,
              onChange: (t) => h(t.target.value),
              "aria-label": tr(
                "filter_by_price_range_aria",
                "Filter by price range",
              ),
            },
            e.createElement(
              "option",
              { value: "" },
              tr("all_prices", "All Prices"),
            ),
            e.createElement(
              "option",
              { value: "0-25000" },
              tr("price_under_25000", "Under Rs 25,000"),
            ),
            e.createElement(
              "option",
              { value: "25000-50000" },
              tr("price_25000_50000", "Rs 25,000 - Rs 50,000"),
            ),
            e.createElement(
              "option",
              { value: "50000-75000" },
              tr("price_50000_75000", "Rs 50,000 - Rs 75,000"),
            ),
            e.createElement(
              "option",
              { value: "75000+" },
              tr("price_above_75000", "Above Rs 75,000"),
            ),
          ),
          e.createElement(
            "button",
            {
              className: "btn btn-primary",
              onClick: p ? v : void 0,
              disabled: !p,
              "data-ux-action": "buyer_view_reset_filters",
            },
            e.createElement(E, { className: "w-4 h-4 mr-2" }),
            p
              ? tr("reset_filters", "Reset Filters")
              : tr("filters_applied", "Filters Applied"),
          ),
        ),
        p &&
          e.createElement(
            "div",
            { className: "mt-4" },
            e.createElement(
              "button",
              { className: "btn btn-secondary", onClick: v },
              e.createElement(V, { className: "w-4 h-4 mr-2" }),
              tr("clear_filters", "Clear filters"),
            ),
          ),
      ),
      m &&
        e.createElement(U, {
          marker: "loading",
          className: "border-0 shadow-none bg-transparent",
          title: r("loading") || "Loading...",
          description: tr(
            "buyer_listings_loading_desc",
            "Fetching buyer listings.",
          ),
        }),
      !m &&
        u &&
        e.createElement(I, {
          marker: "error",
          className: "border border-red-200 bg-red-50",
          title: tr("buyer_listings_unavailable", "Buyer listings unavailable"),
          description: u,
          onRetry: C,
          secondaryAction: e.createElement(
            "button",
            { className: "btn btn-secondary", onClick: () => a("/all-posts") },
            tr("browse_all_posts", "Browse all posts"),
          ),
        }),
      !m &&
        !u &&
        l.length === 0 &&
        e.createElement(K, {
          marker: "empty",
          className: "border-2 border-dashed",
          title: tr("buyer_listings_empty_title", "No matching listings found"),
          description: tr(
            "buyer_listings_empty_desc",
            "Adjust your filters or reset to see all buyer offers.",
          ),
          action: e.createElement(
            "div",
            { className: "flex flex-col sm:flex-row gap-3 justify-center" },
            e.createElement(
              "button",
              { className: "btn btn-primary", onClick: v },
              tr("reset_filters", "Reset filters"),
            ),
            e.createElement(
              "button",
              {
                className: "btn btn-secondary",
                onClick: () => a("/all-posts"),
              },
              tr("browse_marketplace", "View marketplace"),
            ),
          ),
        }),
      !m &&
        !u &&
        l.length > 0 &&
        e.createElement(
          e.Fragment,
          null,
          e.createElement(
            "div",
            { className: "mb-4 text-sm text-gray-500" },
            r("showing_listings", {
              count: l.length,
              defaultValue: `Showing ${l.length} listing${l.length > 1 ? "s" : ""}.`,
            }),
          ),
          e.createElement(
            "div",
            {
              className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
            },
            l.map((t) =>
              e.createElement(
                "div",
                {
                  key: t.id,
                  className: "card hover:shadow-lg transition-shadow",
                },
                e.createElement(
                  "div",
                  { className: "relative" },
                  e.createElement("img", {
                    src: t.image || "/placeholder.svg",
                    onError: (s) => {
                      (s.target.onerror = null),
                        (s.target.src = "/placeholder.svg");
                    },
                    alt: t.title,
                    className: "w-full h-48 object-cover rounded-lg mb-4",
                  }),
                  e.createElement(
                    "button",
                    {
                      className: `absolute top-2 right-2 p-2 rounded-full shadow-md transition ${g[t.id] ? "bg-red-50" : "bg-white hover:bg-gray-50"}`,
                      onClick: () => k(t.id),
                      "aria-label": g[t.id]
                        ? tr("remove_from_favorites", "Remove from favorites")
                        : tr("add_to_favorites", "Add to favorites"),
                    },
                    e.createElement(j, {
                      className: `w-4 h-4 ${g[t.id] ? "text-red-500 fill-red-500" : "text-gray-600"}`,
                    }),
                  ),
                ),
                e.createElement(
                  "div",
                  { className: "space-y-3" },
                  e.createElement(
                    "div",
                    null,
                    e.createElement(
                      "h3",
                      { className: "text-lg font-semibold text-gray-900" },
                      t.title,
                    ),
                    e.createElement(
                      "p",
                      { className: "text-sm text-gray-500" },
                      t.condition,
                    ),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex justify-between items-center" },
                    e.createElement(
                      "span",
                      { className: "text-2xl font-bold text-green-600" },
                      t.price,
                    ),
                    e.createElement(
                      "span",
                      { className: "text-sm text-gray-500" },
                      t.postedDate,
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "flex items-center space-x-2 text-sm text-gray-600",
                    },
                    e.createElement(G, { className: "w-4 h-4" }),
                    e.createElement("span", null, t.location),
                  ),
                  e.createElement(
                    "div",
                    { className: "flex items-center justify-between" },
                    e.createElement(
                      "div",
                      { className: "flex items-center space-x-2" },
                      e.createElement(
                        "span",
                        { className: "text-sm text-gray-600" },
                        `${tr("seller", "Seller")}: ${t.seller}`,
                      ),
                      t.verified &&
                        e.createElement(
                          "span",
                          {
                            className:
                              "bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full",
                          },
                          tr("verified", "Verified"),
                        ),
                    ),
                  ),
                  e.createElement(
                    "div",
                    {
                      className:
                        "post-action-row flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap pt-2 scrollbar-hide",
                    },
                    e.createElement(
                      "button",
                      {
                        className:
                          "btn btn-secondary flex-1 min-w-[110px] h-8 px-2 text-[10px] sm:min-w-[120px] sm:h-9 sm:px-3 sm:text-xs",
                        onClick: () => a("/chat"),
                      },
                      e.createElement(O, { className: "w-4 h-4 mr-1" }),
                      tr("contact", "Contact"),
                    ),
                    e.createElement(
                      "button",
                      {
                        className:
                          "btn btn-primary flex-1 min-w-[110px] h-8 px-2 text-[10px] sm:min-w-[120px] sm:h-9 sm:px-3 sm:text-xs",
                        onClick: () => a("/all-posts"),
                      },
                      tr("view_details", "View Details"),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
    );
  };
var R = Q;
export { R as default };
