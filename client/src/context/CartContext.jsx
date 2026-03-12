import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "mhub_cart_v1";

const normalizePrice = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeItem = (item) => {
  if (!item) return null;
  const id = String(item.id ?? item.post_id ?? item.postId ?? "").trim();
  if (!id) return null;
  return {
    id,
    title: String(item.title ?? item.name ?? "Untitled"),
    price: normalizePrice(item.price ?? 0),
    image: item.image ?? item.imageUrl ?? item.thumbnail ?? "",
    seller: item.seller ?? item.sellerName ?? item.userName ?? "",
    location: item.location ?? item.city ?? "",
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

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readStoredCart());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  const addItem = (item) => {
    const normalized = normalizeItem(item);
    if (!normalized) return;
    setItems((prev) => {
      const index = prev.findIndex((entry) => entry.id === normalized.id);
      if (index === -1) {
        return [...prev, { ...normalized, qty: 1 }];
      }
      // Idempotent add: same listing should not be duplicated by repeated taps.
      return prev;
    });
  };

  const removeItem = (id) => {
    const targetId = String(id ?? "");
    if (!targetId) return;
    setItems((prev) => prev.filter((entry) => entry.id !== targetId));
  };

  const updateQty = (id, qty) => {
    const targetId = String(id ?? "");
    if (!targetId) return;
    const nextQty = Math.max(0, Number(qty) || 0);
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
  };

  const clear = () => setItems([]);

  const totalCount = useMemo(
    () =>
      items.reduce((sum, entry) => sum + Number(entry.qty ?? 1), 0),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, entry) =>
          sum + Number(entry.qty ?? 1) * normalizePrice(entry.price),
        0,
      ),
    [items],
  );

  const isInCart = (id) =>
    items.some((entry) => entry.id === String(id ?? ""));

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQty,
      clear,
      totalCount,
      subtotal,
      isInCart,
    }),
    [items, subtotal, totalCount],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (ctx) return ctx;

  // Safe fallback for isolated test renders or pages mounted without providers.
  return {
    items: [],
    addItem: () => {},
    removeItem: () => {},
    updateQty: () => {},
    clear: () => {},
    totalCount: 0,
    subtotal: 0,
    isInCart: () => false,
  };
}
