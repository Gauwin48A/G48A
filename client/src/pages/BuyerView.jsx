import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Search as SearchIcon,
  Filter as FilterIcon,
  MapPin as MapPinIcon,
  Phone as PhoneIcon,
  Heart as HeartIcon,
  RotateCcw as RotateCcwIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from "@/components/page-state/PageStateBlocks";
import api from "@/services/api";
const normalizePrice = (value) => {
    const parsed = Number(String(value || "").replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  },
  formatPrice = (value) => {
    const numeric = normalizePrice(value);
    if (!numeric) return "Price on request";
    return `Rs ${numeric.toLocaleString()}`;
  },
  formatRelativeTime = (value) => {
    if (!value) return "Recently";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  },
  extractBrand = (post) =>
    String(
      post?.brand ||
        post?.brand_name ||
        post?.brandName ||
        post?.model ||
        post?.model_name ||
        post?.modelName ||
        "Other",
    ).trim() || "Other",
  extractLocation = (post) => {
    const raw =
      post?.location ||
      post?.city ||
      post?.area ||
      post?.state ||
      post?.address ||
      "";
    return String(raw || "").trim() || "Location unknown";
  },
  extractImage = (post) => {
    const candidates = [];
    const pushValue = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((entry) => pushValue(entry));
        return;
      }
      const trimmed = String(value || "").trim();
      if (trimmed) candidates.push(trimmed);
    };
    pushValue(post?.image_url);
    pushValue(post?.imageUrl);
    pushValue(post?.thumbnail);
    pushValue(post?.images);
    pushValue(post?.image_urls);
    pushValue(post?.imageUrls);
    const unique = Array.from(new Set(candidates));
    return unique[0] || "/placeholder.svg";
  },
  mapPostToListing = (post) => {
    if (!post) return null;
    const id = post.post_id ?? post.id ?? post.postId ?? null;
    if (id === null || id === undefined) return null;
    const priceValue = normalizePrice(post.price);
    const verified =
      Boolean(
        post?.aadhaar_verified ||
          post?.pan_verified ||
          post?.user?.aadhaarVerified ||
          post?.user?.panVerified ||
          post?.user?.verified,
      );
    return {
      id,
      title: post.title || "Untitled listing",
      brand: extractBrand(post),
      price: formatPrice(priceValue),
      priceValue,
      condition: post.condition || post.post_type || "Used",
      location: extractLocation(post),
      seller:
        post.user_name ||
        post.username ||
        post.user?.name ||
        post.user?.username ||
        "Seller",
      verified,
      image: extractImage(post),
      postedDate: formatRelativeTime(post.created_at || post.updated_at),
    };
  },
  matchesPriceRange = (priceValue, range) =>
    range
      ? range === "0-25000"
        ? priceValue <= 25e3
        : range === "25000-50000"
          ? priceValue > 25e3 &&
            priceValue <= 5e4
          : range === "50000-75000"
            ? priceValue > 5e4 &&
              priceValue <= 75e3
            : range === "75000+"
              ? priceValue > 75e3
              : !0
      : !0,
  BuyerView = () => {
    const { t: translate } = useTranslation(),
      tr = (key, fallback) => translate(key, { defaultValue: fallback }),
      navigate = useNavigate(),
      [searchQuery, setSearchQuery] = useState(""),
      [brandFilter, setBrandFilter] = useState(""),
      [priceRange, setPriceRange] = useState(""),
      [isLoading, setIsLoading] = useState(!0),
      [errorMsg, setErrorMsg] = useState(""),
      [listings, setListings] = useState([]),
      [brandOptions, setBrandOptions] = useState([]),
      [favorites, setFavorites] = useState({}),
      requestRef = useRef(0),
      hasActiveFilters = !!(searchQuery.trim() || brandFilter || priceRange),
      fetchListings = useCallback(async () => {
        const requestId = ++requestRef.current;
        setIsLoading(!0);
        setErrorMsg("");
        try {
          const baseParams = {
            limit: 60,
            page: 1,
            sortBy: "created_at",
            sortOrder: "desc",
            category: "Mobiles",
          };
          let response = await api.get("/posts", { params: baseParams });
          let payload = response?.data ?? response;
          let posts = Array.isArray(payload?.posts) ? payload.posts : [];
          if (posts.length === 0) {
            response = await api.get("/posts", {
              params: {
                ...baseParams,
                category: undefined,
                category_group: "electronics",
              },
            });
            payload = response?.data ?? response;
            posts = Array.isArray(payload?.posts) ? payload.posts : [];
          }
          if (requestId !== requestRef.current) return;
          const mapped = posts
            .map(mapPostToListing)
            .filter(Boolean);
          setListings(mapped);
        } catch (err) {
          if (requestId !== requestRef.current) return;
          setErrorMsg(
            tr(
              "buyer_listings_retry_desc",
              err?.message ||
                "Unable to load buyer listings right now. Please retry.",
            ),
          );
          setListings([]);
        } finally {
          if (requestId === requestRef.current) {
            setIsLoading(!1);
          }
        }
      }, [tr]);
    useEffect(() => {
      let active = true;
      (async () => {
        try {
          const response = await api.get("/brands");
          if (!active) return;
          const payload = response?.data ?? response;
          const list = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.brands)
              ? payload.brands
              : [];
          const names = list
            .map(
              (entry) =>
                entry?.name || entry?.brand || entry?.label || entry?.title || "",
            )
            .map((value) => String(value || "").trim())
            .filter(Boolean);
          setBrandOptions(Array.from(new Set(names)));
        } catch {
          if (active) setBrandOptions([]);
        }
      })();
      return () => {
        active = false;
      };
    }, []);
    useEffect(
      () => (
        fetchListings(),
        () => {
          requestRef.current += 1;
        }
      ),
      [fetchListings],
    );
    const filteredListings = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return listings.filter((item) => {
          const numericPrice = Number(item.priceValue || 0),
            matchesSearch =
              !query ||
              item.title.toLowerCase().includes(query) ||
              item.seller.toLowerCase().includes(query) ||
              item.location.toLowerCase().includes(query),
            matchesBrand = !brandFilter || item.brand === brandFilter;
          return matchesSearch && matchesBrand && matchesPriceRange(numericPrice, priceRange);
        });
      }, [listings, priceRange, searchQuery, brandFilter]),
      resetFilters = () => {
        setSearchQuery(""), setBrandFilter(""), setPriceRange("");
      },
      availableBrands = useMemo(() => {
        const collected = new Set();
        listings.forEach((item) => {
          const brand = String(item.brand || "").trim();
          if (brand) collected.add(brand);
        });
        const list = Array.from(collected);
        return list.length ? list : brandOptions;
      }, [listings, brandOptions]),
      toggleFavorite = (id) => {
        setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
      };
    return React.createElement(
      "div",
      {
        className:
          "min-h-screen mhub-premium-page bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 main-content page-shell page-pad dark:bg-gradient-to-br",
      },
      React.createElement(
        "div",
        { className: "mb-8" },
        React.createElement(
          "h1",
          { className: "text-3xl font-bold text-gray-900 dark:text-white mb-4 dark:text-3xl dark:text-gray-100" },
          tr("browse_phones", "Browse Mobile Phones"),
        ),
        React.createElement(
          "p",
          { className: "text-gray-600 dark:text-gray-400 dark:text-gray-200" },
          tr(
            "buyer_view_subtitle",
            "Find your perfect mobile phone from verified sellers.",
          ),
        ),
      ),
      React.createElement(
        "div",
        { className: "card mb-8" },
        React.createElement(
          "div",
          { className: "grid grid-cols-1 md:grid-cols-4 gap-4" },
          React.createElement(
            "div",
            { className: "relative" },
            React.createElement(SearchIcon, {
              className:
                "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 dark:text-gray-300",
            }),
            React.createElement("input", {
              type: "text",
              placeholder: tr(
                "search_mobiles_placeholder",
                "Search mobiles...",
              ),
              className: "input pl-10",
              value: searchQuery,
              onChange: (evt) => setSearchQuery(evt.target.value),
              "aria-label": tr(
                "search_buyer_listings_aria",
                "Search buyer listings",
              ),
            }),
          ),
          React.createElement(
            "select",
            {
              className: "input",
              value: brandFilter,
              onChange: (evt) => setBrandFilter(evt.target.value),
              "aria-label": tr("filter_by_brand_aria", "Filter by brand"),
            },
            React.createElement(
              "option",
              { value: "" },
              tr("all_brands", "All Brands"),
            ),
            availableBrands.map((brand) =>
              React.createElement("option", { key: brand, value: brand }, brand),
            ),
          ),
          React.createElement(
            "select",
            {
              className: "input",
              value: priceRange,
              onChange: (evt) => setPriceRange(evt.target.value),
              "aria-label": tr(
                "filter_by_price_range_aria",
                "Filter by price range",
              ),
            },
            React.createElement(
              "option",
              { value: "" },
              tr("all_prices", "All Prices"),
            ),
            React.createElement(
              "option",
              { value: "0-25000" },
              tr("price_under_25000", "Under Rs 25,000"),
            ),
            React.createElement(
              "option",
              { value: "25000-50000" },
              tr("price_25000_50000", "Rs 25,000 - Rs 50,000"),
            ),
            React.createElement(
              "option",
              { value: "50000-75000" },
              tr("price_50000_75000", "Rs 50,000 - Rs 75,000"),
            ),
            React.createElement(
              "option",
              { value: "75000+" },
              tr("price_above_75000", "Above Rs 75,000"),
            ),
          ),
          React.createElement(
            "button",
            {
              className: "btn btn-primary",
              onClick: hasActiveFilters ? resetFilters : void 0,
              disabled: !hasActiveFilters,
              "data-ux-action": "buyer_view_reset_filters",
            },
            React.createElement(FilterIcon, { className: "w-4 h-4 mr-2" }),
            hasActiveFilters
              ? tr("reset_filters", "Reset Filters")
              : tr("filters_applied", "Filters Applied"),
          ),
        ),
        hasActiveFilters &&
          React.createElement(
            "div",
            { className: "mt-4" },
            React.createElement(
              "button",
              { className: "btn btn-secondary", onClick: resetFilters },
              React.createElement(RotateCcwIcon, { className: "w-4 h-4 mr-2" }),
              tr("clear_filters", "Clear filters"),
            ),
          ),
      ),
      isLoading &&
        React.createElement(PageLoadingState, {
          marker: "loading",
          className: "border-0 shadow-none bg-transparent dark:border-0 dark:bg-transparent",
          title: translate("loading") || "Loading...",
          description: tr(
            "buyer_listings_loading_desc",
            "Fetching buyer listings.",
          ),
        }),
      !isLoading &&
        errorMsg &&
        React.createElement(PageErrorState, {
          marker: "error",
          className: "border border-red-200 bg-red-50 dark:border dark:border-red-600/40 dark:bg-red-950/20",
          title: tr("buyer_listings_unavailable", "Buyer listings unavailable"),
          description: errorMsg,
          onRetry: fetchListings,
          secondaryAction: React.createElement(
            "button",
            { className: "btn btn-secondary", onClick: () => navigate("/all-posts") },
            tr("browse_all_posts", "Browse all posts"),
          ),
        }),
      !isLoading &&
        !errorMsg &&
        filteredListings.length === 0 &&
        React.createElement(PageEmptyState, {
          marker: "empty",
          className: "border-2 border-dashed dark:border-2 dark:border-dashed",
          title: tr("buyer_listings_empty_title", "No matching listings found"),
          description: tr(
            "buyer_listings_empty_desc",
            "Adjust your filters or reset to see all buyer offers.",
          ),
          action: React.createElement(
            "div",
            { className: "flex flex-col sm:flex-row gap-3 justify-center" },
            React.createElement(
              "button",
              { className: "btn btn-primary", onClick: resetFilters },
              tr("reset_filters", "Reset filters"),
            ),
            React.createElement(
              "button",
              {
                className: "btn btn-secondary",
                onClick: () => navigate("/all-posts"),
              },
              tr("browse_marketplace", "View marketplace"),
            ),
          ),
        }),
      !isLoading &&
        !errorMsg &&
        filteredListings.length > 0 &&
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            { className: "mb-4 text-sm text-gray-500 dark:text-sm dark:text-gray-300" },
            translate("showing_listings", {
              count: filteredListings.length,
              defaultValue: `Showing ${filteredListings.length} listing${filteredListings.length > 1 ? "s" : ""}.`,
            }),
          ),
          React.createElement(
            "div",
            {
              className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
            },
            filteredListings.map((listing) =>
              React.createElement(
                "div",
                {
                  key: listing.id,
                  className: "card hover:shadow-lg transition-shadow",
                },
                React.createElement(
                  "div",
                  { className: "relative" },
                  React.createElement("img", {
                    src: listing.image || "/placeholder.svg",
                    onError: (imgEvt) => {
                      (imgEvt.target.onerror = null),
                        (imgEvt.target.src = "/placeholder.svg");
                    },
                    alt: listing.title,
                    className: "w-full h-48 object-cover rounded-lg mb-4",
                  }),
                  React.createElement(
                    "button",
                    {
                      className: `absolute top-2 right-2 p-2 rounded-full shadow-md transition ${favorites[listing.id] ? "bg-red-50" : "bg-white hover:bg-gray-50"}`,
                      onClick: () => toggleFavorite(listing.id),
                      "aria-label": favorites[listing.id]
                        ? tr("remove_from_favorites", "Remove from favorites")
                        : tr("add_to_favorites", "Add to favorites"),
                    },
                    React.createElement(HeartIcon, {
                      className: `w-4 h-4 ${favorites[listing.id] ? "text-red-500 fill-red-500" : "text-gray-600"}`,
                    }),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "space-y-3" },
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "h3",
                      { className: "text-lg font-semibold text-gray-900 dark:text-lg dark:text-gray-100" },
                      listing.title,
                    ),
                    React.createElement(
                      "p",
                      { className: "text-sm text-gray-500 dark:text-sm dark:text-gray-300" },
                      listing.condition,
                    ),
                  ),
                  React.createElement(
                    "div",
                    { className: "flex justify-between items-center" },
                    React.createElement(
                      "span",
                      { className: "text-2xl font-bold text-green-600 dark:text-2xl dark:text-green-300" },
                      listing.price,
                    ),
                    React.createElement(
                      "span",
                      { className: "text-sm text-gray-500 dark:text-sm dark:text-gray-300" },
                      listing.postedDate,
                    ),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "flex items-center space-x-2 text-sm text-gray-600 dark:text-sm dark:text-gray-200",
                    },
                    React.createElement(MapPinIcon, { className: "w-4 h-4" }),
                    React.createElement("span", null, listing.location),
                  ),
                  React.createElement(
                    "div",
                    { className: "flex items-center justify-between" },
                    React.createElement(
                      "div",
                      { className: "flex items-center space-x-2" },
                      React.createElement(
                        "span",
                        { className: "text-sm text-gray-600 dark:text-sm dark:text-gray-200" },
                        `${tr("seller", "Seller")}: ${listing.seller}`,
                      ),
                      listing.verified &&
                        React.createElement(
                          "span",
                          {
                            className:
                              "bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full dark:bg-green-950/20 dark:text-green-200 dark:text-xs",
                          },
                          tr("verified", "Verified"),
                        ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    {
                      className:
                        "post-action-row flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap pt-2 scrollbar-hide",
                    },
                    React.createElement(
                      "button",
                      {
                        className:
                          "btn btn-secondary flex-1 min-w-[110px] h-8 px-2 text-[10px] sm:min-w-[120px] sm:h-9 sm:px-3 sm:text-xs dark:text-[10px] dark:sm:text-xs",
                        onClick: () => navigate("/chat"),
                      },
                      React.createElement(PhoneIcon, { className: "w-4 h-4 mr-1" }),
                      tr("contact", "Contact"),
                    ),
                    React.createElement(
                      "button",
                      {
                        className:
                          "btn btn-primary flex-1 min-w-[110px] h-8 px-2 text-[10px] sm:min-w-[120px] sm:h-9 sm:px-3 sm:text-xs dark:text-[10px] dark:sm:text-xs",
                        onClick: () => navigate("/all-posts"),
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
var BuyerViewDefault = BuyerView;
export { BuyerViewDefault as default };
