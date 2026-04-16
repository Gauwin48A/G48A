import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasAuthSession } from "@/utils/authStorage";

const CartContext = createContext(null);
const STORAGE_KEY = "mhub_cart_v1";
const SYNC_KEY = "mhub_cart_sync";
const CHANNEL_NAME = "mhub_cart_channel";

const normalizePrice = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeItem = (item) => {
  if (!item) return null;
  const postId = String(item.post_id ?? item.postId ?? item.id ?? "").trim();
  const cartItemId = String(item.cart_item_id ?? item.cartItemId ?? "").trim();
  const id = postId || cartItemId;
  if (!id) return null;
  const categoryId =
    item.category_id ??
    item.categoryId ??
    item.category?.category_id ??
    item.category?.id ??
    null;
  const categoryName =
    item.category_name ??
    item.categoryName ??
    item.category_title ??
    item.categoryTitle ??
    (typeof item.category === "object"
      ? item.category?.name || item.category?.title || item.category?.label
      : item.category) ??
    "";
  const categoryGroup =
    item.category_group ??
    item.categoryGroup ??
    item.category?.category_group ??
    item.category?.categoryGroup ??
    "";
  const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
  const currency =
    item.currency ??
    item.currency_code ??
    item.currencyCode ??
    null;

  return {
    id,
    cart_item_id: cartItemId || null,
    post_id: postId || null,
    title: String(item.title ?? item.name ?? "Untitled"),
    price: normalizePrice(item.current_price ?? item.price ?? 0),
    currency: currency ? String(currency).toUpperCase() : null,
    originalPrice: item.price_at_add ?? item.originalPrice ?? null,
    image: item.image_url ?? item.image ?? item.thumbnail ?? "",
    seller: item.seller_name ?? item.seller ?? item.userName ?? "",
    location: item.location ?? item.city ?? "",
    category_id: categoryId,
    category: String(categoryName || "").trim(),
    category_group: String(categoryGroup || "").trim(),
    qty: quantity,
    availability_status: item.availability_status || "available",
    status: item.status || "active",
    price_at_add: item.price_at_add ?? null,
    price_changed: Boolean(item.price_changed),
    price_delta: item.price_delta ?? null,
    price_change_pct: item.price_change_pct ?? null,
    max_quantity: item.max_quantity ?? null,
  };
};

const readStoredCart = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStoredCart = (items) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
};

const clearStoredCart = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

const buildSummaryFromItems = (items) => {
  const defaultCurrency =
    (Array.isArray(items) ? items : []).find((item) => item?.currency)
      ?.currency || "INR";
  const subtotal = items.reduce(
    (sum, entry) => sum + Number(entry.qty ?? 1) * normalizePrice(entry.price),
    0,
  );
  const itemCount = items.reduce(
    (sum, entry) => sum + Number(entry.qty ?? 1),
    0,
  );
  return {
    currency: defaultCurrency,
    subtotal,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: subtotal,
    itemCount,
    unavailableCount: 0,
    freeShippingThreshold: null,
  };
};

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [summary, setSummary] = useState(buildSummaryFromItems([]));
  const [promotion, setPromotion] = useState(null);
  const [maxQuantity, setMaxQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const channelRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  const isAuthed = useMemo(
    () => Boolean(user || hasAuthSession()),
    [user],
  );

  const broadcastUpdate = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SYNC_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    try {
      channelRef.current?.postMessage({ type: "cart_updated" });
    } catch {
      // ignore
    }
  }, []);

  const applyGuestCart = useCallback(() => {
    const stored = readStoredCart();
    setItems(stored);
    setSavedItems([]);
    setSummary(buildSummaryFromItems(stored));
    setPromotion(null);
    setMaxQuantity(10);
  }, []);

  const refreshCart = useCallback(
    async ({ coupon } = {}) => {
      if (!isAuthed) {
        applyGuestCart();
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/cart", {
          params: { includeSaved: true, coupon },
        });
        const payload = response?.data ?? response;
        const normalizedItems = Array.isArray(payload?.items)
          ? payload.items.map(normalizeItem).filter(Boolean)
          : [];
        const normalizedSaved = Array.isArray(payload?.savedItems)
          ? payload.savedItems.map(normalizeItem).filter(Boolean)
          : [];
        setItems(normalizedItems);
        setSavedItems(normalizedSaved);
        setSummary(payload?.summary || buildSummaryFromItems(normalizedItems));
        setPromotion(payload?.promotion || null);
        setMaxQuantity(payload?.maxQuantity || 10);
      } catch (err) {
        setError(err?.message || "Failed to load cart");
      } finally {
        setLoading(false);
      }
    },
    [applyGuestCart, isAuthed],
  );

  const syncGuestCartToServer = useCallback(async () => {
    if (!isAuthed) return;
    const stored = readStoredCart();
    if (!stored.length) return;
    try {
      await Promise.all(
        stored.map((entry) =>
          api.post("/cart/items", {
            postId: entry.post_id ?? entry.id,
            quantity: Number(entry.qty ?? 1) || 1,
          }),
        ),
      );
      clearStoredCart();
      broadcastUpdate();
    } catch {
      // keep local storage on sync failure
    }
  }, [broadcastUpdate, isAuthed]);

  useEffect(() => {
    if (!isAuthed) {
      applyGuestCart();
      return;
    }
    void syncGuestCartToServer();
    void refreshCart();
  }, [applyGuestCart, isAuthed, refreshCart, syncGuestCartToServer]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (typeof BroadcastChannel !== "undefined") {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current.onmessage = (event) => {
        if (event?.data?.type === "cart_updated") {
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          syncTimeoutRef.current = setTimeout(() => {
            refreshCart();
          }, 150);
        }
      };
    }

    const handleStorage = (event) => {
      if (event.key !== SYNC_KEY) return;
      refreshCart();
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, [refreshCart]);

  useEffect(() => {
    if (isAuthed) return;
    writeStoredCart(items);
  }, [isAuthed, items]);

  const addItem = useCallback(
    async (item, options = {}) => {
      const normalized = normalizeItem(item);
      if (!normalized) return;

      if (!isAuthed) {
        setItems((prev) => {
          const index = prev.findIndex(
            (entry) => entry.id === normalized.id,
          );
          if (index === -1) {
            return [...prev, { ...normalized, qty: 1 }];
          }
          const next = [...prev];
          const currentQty = Number(next[index].qty ?? 1);
          next[index] = {
            ...next[index],
            qty: Math.min(currentQty + 1, maxQuantity),
          };
          return next;
        });
        broadcastUpdate();
        return;
      }

      try {
        await api.post("/cart/items", {
          postId: normalized.post_id ?? normalized.id,
          quantity: options.quantity ?? 1,
          status: options.status ?? "active",
        });
        await refreshCart();
        broadcastUpdate();
      } catch (err) {
        setError(err?.message || "Failed to add to cart");
      }
    },
    [broadcastUpdate, isAuthed, maxQuantity, refreshCart],
  );

  const updateQty = useCallback(
    async (id, qty) => {
      const targetId = String(id ?? "");
      if (!targetId) return;
      const nextQty = Math.max(0, Math.min(maxQuantity, Number(qty) || 0));

      if (!isAuthed) {
        setItems((prev) => {
          const index = prev.findIndex((entry) => entry.id === targetId);
          if (index === -1) return prev;
          if (nextQty <= 0) {
            return prev.filter((entry) => entry.id !== targetId);
          }
          const next = [...prev];
          next[index] = { ...next[index], qty: nextQty };
          return next;
        });
        broadcastUpdate();
        return;
      }

      const entry = items.find((item) => item.id === targetId);
      const cartItemId = entry?.cart_item_id || null;
      try {
        await api.patch(`/cart/items/${cartItemId || targetId}`, {
          postId: entry?.post_id,
          quantity: nextQty,
        });
        await refreshCart();
        broadcastUpdate();
      } catch (err) {
        setError(err?.message || "Failed to update cart");
      }
    },
    [broadcastUpdate, isAuthed, items, maxQuantity, refreshCart],
  );

  const removeItem = useCallback(
    async (id) => {
      const targetId = String(id ?? "");
      if (!targetId) return;

      if (!isAuthed) {
        setItems((prev) => prev.filter((entry) => entry.id !== targetId));
        broadcastUpdate();
        return;
      }

      const entry = items.find((item) => item.id === targetId);
      const cartItemId = entry?.cart_item_id || null;
      try {
        await api.delete(`/cart/items/${cartItemId || targetId}`, {
          data: { postId: entry?.post_id ?? targetId },
        });
        await refreshCart();
        broadcastUpdate();
      } catch (err) {
        setError(err?.message || "Failed to remove item");
      }
    },
    [broadcastUpdate, isAuthed, items, refreshCart],
  );

  const clear = useCallback(async (scope = "active") => {
    if (!isAuthed) {
      setItems([]);
      broadcastUpdate();
      return;
    }
    try {
      await api.post("/cart/clear", { scope });
      await refreshCart();
      broadcastUpdate();
    } catch (err) {
      setError(err?.message || "Failed to clear cart");
    }
  }, [broadcastUpdate, isAuthed, refreshCart]);

  const saveForLater = useCallback(
    async (id) => {
      const targetId = String(id ?? "");
      if (!targetId) return;
      if (!isAuthed) return;
      const entry = items.find((item) => item.id === targetId);
      const cartItemId = entry?.cart_item_id || null;
      try {
        await api.patch(`/cart/items/${cartItemId || targetId}`, {
          postId: entry?.post_id,
          status: "saved",
        });
        await refreshCart();
        broadcastUpdate();
      } catch (err) {
        setError(err?.message || "Failed to save for later");
      }
    },
    [broadcastUpdate, isAuthed, items, refreshCart],
  );

  const moveToCart = useCallback(
    async (id) => {
      const targetId = String(id ?? "");
      if (!targetId) return;
      if (!isAuthed) return;
      const entry = savedItems.find((item) => item.id === targetId);
      const cartItemId = entry?.cart_item_id || null;
      try {
        await api.patch(`/cart/items/${cartItemId || targetId}`, {
          postId: entry?.post_id,
          status: "active",
        });
        await refreshCart();
        broadcastUpdate();
      } catch (err) {
        setError(err?.message || "Failed to move to cart");
      }
    },
    [broadcastUpdate, isAuthed, savedItems, refreshCart],
  );

  const applyCoupon = useCallback(
    async (code) => {
      if (!isAuthed) return null;
      try {
        const response = await api.post("/cart/summary", {
          coupon: code,
          includeSaved: true,
        });
        const payload = response?.data ?? response;
        setSummary(payload?.summary || summary);
        setPromotion(payload?.promotion || null);
        return payload?.promotion || null;
      } catch (err) {
        setError(err?.message || "Failed to apply coupon");
        return null;
      }
    },
    [isAuthed, summary],
  );

  const totalCount = useMemo(
    () => Number(summary?.itemCount ?? items.reduce((sum, entry) => sum + Number(entry.qty ?? 1), 0)),
    [items, summary?.itemCount],
  );

  const subtotal = useMemo(
    () => Number(summary?.subtotal ?? buildSummaryFromItems(items).subtotal),
    [items, summary?.subtotal],
  );

  const currencyTotals = useMemo(() => {
    const totals = {};
    (items || []).forEach((item) => {
      const code = item?.currency || summary?.currency || "INR";
      const qty = Number(item?.qty ?? 1);
      const lineTotal = Number(item?.price ?? 0) * qty;
      if (!Number.isFinite(lineTotal)) return;
      if (!totals[code]) {
        totals[code] = { subtotal: 0, itemCount: 0 };
      }
      totals[code].subtotal += lineTotal;
      totals[code].itemCount += qty;
    });
    Object.values(totals).forEach((entry) => {
      entry.subtotal = Number(Number(entry.subtotal || 0).toFixed(2));
    });
    return totals;
  }, [items, summary?.currency]);

  const hasMixedCurrency = useMemo(
    () => Object.keys(currencyTotals || {}).length > 1,
    [currencyTotals],
  );

  const isInCart = useCallback(
    (id) => items.some((entry) => entry.post_id === String(id ?? "") || entry.id === String(id ?? "")),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      savedItems,
      summary,
      promotion,
      maxQuantity,
      loading,
      error,
      refreshCart,
      addItem,
      removeItem,
      updateQty,
      clear,
      saveForLater,
      moveToCart,
      applyCoupon,
      totalCount,
      subtotal,
      isInCart,
      currencyTotals,
      hasMixedCurrency,
      isAuthenticated: isAuthed,
    }),
    [
      items,
      savedItems,
      summary,
      promotion,
      maxQuantity,
      loading,
      error,
      refreshCart,
      addItem,
      removeItem,
      updateQty,
      clear,
      saveForLater,
      moveToCart,
      applyCoupon,
      totalCount,
      subtotal,
      isInCart,
      currencyTotals,
      hasMixedCurrency,
      isAuthed,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (ctx) return ctx;

  const noop = () => {};
  return {
    items: [],
    savedItems: [],
    summary: buildSummaryFromItems([]),
    promotion: null,
    maxQuantity: 10,
    loading: false,
    error: "",
    refreshCart: noop,
    addItem: noop,
    removeItem: noop,
    updateQty: noop,
    clear: noop,
    saveForLater: noop,
    moveToCart: noop,
    applyCoupon: noop,
    totalCount: 0,
    subtotal: 0,
    isInCart: () => false,
    currencyTotals: {},
    hasMixedCurrency: false,
    isAuthenticated: false,
  };
}
