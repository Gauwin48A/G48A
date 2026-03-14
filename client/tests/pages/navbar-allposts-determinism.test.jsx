// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { FilterProvider } from "@/context/FilterContext";
import GreenNavbar from "@/components/GreenNavbar";
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
    logout: vi.fn(),
  }),
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({ totalCount: 0 }),
}));

vi.mock("@/context/LocationContext", () => ({
  useLocation: () => ({
    city: "Hyderabad",
    area: "",
    locality: "",
    displayName: "Hyderabad",
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

vi.mock("@/components/LocationSelector", () => ({
  default: () => null,
}));

vi.mock("@/components/LanguageSelector", () => ({
  default: () => <div data-testid="language-selector" />,
}));

vi.mock("@/utils/savedPosts", () => ({
  getSavedPostsMap: () => ({}),
  beginSavedPostMutation: (id) => String(id ?? ""),
  endSavedPostMutation: () => {},
  isSavedPostMutationInFlight: () => false,
  subscribeSavedPosts: (cb) => {
    cb({});
    return () => {};
  },
  buildSavedPostsMap: () => ({}),
  extractSavedPostIds: () => [],
  replaceSavedPostIds: () => {},
  setSavedPostStatus: () => {},
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

function renderApp(initialEntries = ["/search"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries} future={routerFuture}>
      <FilterProvider>
        <GreenNavbar />
        <Routes>
          <Route path="/all-posts" element={<AllPosts />} />
          <Route path="/search" element={<div>Search page</div>} />
        </Routes>
      </FilterProvider>
    </MemoryRouter>,
  );
}

let originalIntersectionObserver;
let originalScrollTo;
let originalMatchMedia;

describe("Navbar search/filter -> AllPosts determinism", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("authToken", "token-123");
    localStorage.setItem("userId", "42");

    fetchCategoriesCached.mockResolvedValue([
      { category_id: "1", name: "Electronics" },
      { category_id: "2", name: "Fashion" },
    ]);

    hoisted.apiGet.mockResolvedValue({ posts: buildPosts(6) });
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

    originalMatchMedia = window.matchMedia;
    window.matchMedia =
      window.matchMedia ||
      ((query) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
  });

  afterEach(() => {
    localStorage.clear();
    globalThis.IntersectionObserver = originalIntersectionObserver;
    HTMLElement.prototype.scrollTo = originalScrollTo;
    window.matchMedia = originalMatchMedia;
  });

  it("routes navbar search to AllPosts and applies query", async () => {
    renderApp(["/search"]);

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: "iphone" } });
    fireEvent.submit(searchInput.closest("form"));

    await waitFor(() => {
      expect(hoisted.apiGet).toHaveBeenCalled();
    });

    const urls = hoisted.apiGet.mock.calls.map((call) => String(call[0]));
    const match = urls.find((url) => url.includes("/posts?"));

    expect(match).toBeTruthy();
    expect(match).toContain("search=iphone");
  });

  it("applies filter modal values to AllPosts query", async () => {
    renderApp(["/all-posts"]);

    await waitFor(() => {
      expect(hoisted.apiGet).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "filter" }));

    const minInput = screen.getByLabelText("min_price");
    const maxInput = screen.getByLabelText("max_price");

    fireEvent.change(minInput, { target: { value: "1000" } });
    fireEvent.change(maxInput, { target: { value: "5000" } });

    fireEvent.click(screen.getByRole("button", { name: "apply" }));

    await waitFor(() => {
      const urls = hoisted.apiGet.mock.calls.map((call) => String(call[0]));
      expect(
        urls.some(
          (url) =>
            url.includes("minPrice=1000") && url.includes("maxPrice=5000"),
        ),
      ).toBe(true);
    });
  });
});
