// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FilterProvider } from "@/context/FilterContext";
import { CartProvider } from "@/context/CartContext";
import AllPosts from "@/pages/AllPosts";
import { fetchCategoriesCached } from "@/services/categoriesService";

const hoisted = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "42", role: "user" },
    loading: false,
  }),
}));

vi.mock("@/services/categoriesService", () => ({
  fetchCategoriesCached: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: (...args) => hoisted.apiGet(...args),
    post: (...args) => hoisted.apiPost(...args),
    delete: (...args) => hoisted.apiDelete(...args),
  },
}));

vi.mock("@/utils/translateContent", () => ({
  translatePosts: async (posts) => posts,
  translatePostsInstant: (posts) => posts,
}));

vi.mock("@/components/BuyerInterestModal", () => ({
  default: () => null,
}));

vi.mock("@/components/ShareLinkDialog", () => ({
  default: () => null,
}));

const buildPosts = (count) =>
  Array.from({ length: count }, (_, index) => ({
    post_id: index + 1,
    title: `Post ${index + 1}`,
    description: `Description for post ${index + 1}.`,
    category_name: "Electronics",
    price: 1000 + index,
    location: "Hyderabad",
    created_at: "2026-03-05T10:00:00.000Z",
    likes: index,
    views_count: index + 10,
    user: { name: "Seller One", isVerified: true, rating: 4.5 },
  }));

function renderAllPosts() {
  return render(
    <MemoryRouter initialEntries={["/all-posts"]} future={routerFuture}>
      <FilterProvider>
        <CartProvider>
          <AllPosts />
        </CartProvider>
      </FilterProvider>
    </MemoryRouter>,
  );
}

let originalIntersectionObserver;
let originalScrollTo;

describe("AllPosts save/cart state sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("authToken", "token-123");
    localStorage.setItem("userId", "42");

    fetchCategoriesCached.mockResolvedValue([]);

    hoisted.apiGet.mockImplementation((url) => {
      if (String(url || "").startsWith("/wishlist")) {
        return { items: [] };
      }
      return { posts: buildPosts(3) };
    });
    hoisted.apiPost.mockResolvedValue({});
    hoisted.apiDelete.mockResolvedValue({});

    originalIntersectionObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      observe() {}
      disconnect() {}
      unobserve() {}
    };

    originalScrollTo = HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollTo = vi.fn();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    globalThis.IntersectionObserver = originalIntersectionObserver;
    HTMLElement.prototype.scrollTo = originalScrollTo;
  });

  it("toggles save state and persists to storage", async () => {
    renderAllPosts();

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /save/i }).length).toBeGreaterThan(0);
    });

    const saveButton = screen.getAllByRole("button", { name: /save/i })[0];
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /saved/i }).length).toBeGreaterThan(0);
    });

    const raw = localStorage.getItem("mhub_saved_post_ids") || "[]";
    const savedIds = JSON.parse(raw);
    expect(savedIds).toContain("1");

    const savedButton = screen.getAllByRole("button", { name: /saved/i })[0];
    fireEvent.click(savedButton);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /save/i }).length).toBeGreaterThan(0);
    });

    const afterRaw = localStorage.getItem("mhub_saved_post_ids") || "[]";
    const afterIds = JSON.parse(afterRaw);
    expect(afterIds).not.toContain("1");
  });

  it("dedupes rapid save toggles to avoid duplicate writes", async () => {
    renderAllPosts();

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /save/i }).length).toBeGreaterThan(0);
    });

    const saveButton = screen.getAllByRole("button", { name: /save/i })[0];
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    await waitFor(() => {
      const wishlistCalls = hoisted.apiPost.mock.calls.filter(([url]) =>
        String(url).includes("/wishlist"),
      );
      expect(wishlistCalls).toHaveLength(1);
    });
  });

  it("toggles cart state and persists to storage", async () => {
    renderAllPosts();

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /add_to_cart/i }).length).toBeGreaterThan(0);
    });

    const addButton = screen.getAllByRole("button", { name: /add_to_cart/i })[0];
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /in_cart/i }).length).toBeGreaterThan(0);
    });

    const cartRaw = localStorage.getItem("mhub_cart_v1") || "[]";
    const cartItems = JSON.parse(cartRaw);
    expect(cartItems.some((item) => item.id === "1")).toBe(true);
  });
});
