// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FilterProvider } from "@/context/FilterContext";
import AllPosts from "@/pages/AllPosts";
import { fetchCategoriesCached } from "@/services/categoriesService";

const hoisted = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  authUser: { id: "42", user_id: "42", name: "All Posts Tester" },
}));

let originalIntersectionObserver;
let originalScrollTo;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: hoisted.authUser,
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
}));

vi.mock("@/components/BuyerInterestModal", () => ({
  default: () => null,
}));

vi.mock("@/components/ShareLinkDialog", () => ({
  default: ({ open, url }) =>
    open ? <div data-testid="share-dialog">share-url:{url}</div> : null,
}));

const buildPosts = (count, extras = {}) =>
  Array.from({ length: count }, (_, index) => ({
    post_id: index + 1,
    title: `Post ${index + 1}`,
    description: `Description for post ${index + 1} in marketplace feed.`,
    category_name: "Electronics",
    price: 1000 + index,
    location: "Hyderabad",
    created_at: "2026-03-05T10:00:00.000Z",
    likes: index,
    views_count: index + 10,
    user: { name: "Seller One", isVerified: true, rating: 4.5 },
    ...extras,
  }));

function renderAllPosts() {
  return render(
    <MemoryRouter initialEntries={["/all-posts"]}>
      <FilterProvider>
        <AllPosts />
      </FilterProvider>
    </MemoryRouter>,
  );
}

function getCategoryPillButton(namePattern) {
  return screen
    .getAllByRole("button", { name: namePattern })
    .find((button) =>
      String(button.className || "").includes("flex flex-col items-center"),
    );
}

describe("AllPosts filters and media UX", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("authToken", "token-123");
    localStorage.setItem("userId", "42");

    vi.clearAllMocks();

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
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    globalThis.IntersectionObserver = originalIntersectionObserver;
    HTMLElement.prototype.scrollTo = originalScrollTo;
  });

  it("supports category select and deselect on All Posts", async () => {
    renderAllPosts();

    await screen.findByRole("button", { name: /electronics/i });
    const categoryButton = getCategoryPillButton(/electronics/i);

    expect(categoryButton).toBeTruthy();
    expect(categoryButton.className).not.toContain("bg-blue-600");

    fireEvent.click(categoryButton);

    await waitFor(() => {
      expect(getCategoryPillButton(/electronics/i)?.className).toContain(
        "bg-blue-600",
      );
    });

    fireEvent.click(getCategoryPillButton(/electronics/i));

    await waitFor(() => {
      expect(getCategoryPillButton(/electronics/i)?.className).not.toContain(
        "bg-blue-600",
      );
    });
  });

  it("enforces latest window filters to 10 and 5 posts", async () => {
    hoisted.apiGet.mockImplementation(async (url) => {
      const target = String(url || "");
      const parsed = new URL(target, "http://localhost");
      const limit = Number(parsed.searchParams.get("limit") || "6");
      return { posts: buildPosts(limit) };
    });

    renderAllPosts();

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "view_details" })).toHaveLength(6);
    });

    fireEvent.click(screen.getByRole("button", { name: "Latest 10" }));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "view_details" })).toHaveLength(10);
    });

    fireEvent.click(screen.getByRole("button", { name: "Latest 5" }));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "view_details" })).toHaveLength(5);
    });
  });

  it("renders swipe-ready multi-image carousel controls", async () => {
    hoisted.apiGet.mockResolvedValue({
      posts: [
        {
          ...buildPosts(1)[0],
          post_id: 900,
          images: [
            "/uploads/sample-1.jpg",
            "/uploads/sample-2.jpg",
            "/uploads/sample-3.jpg",
          ],
        },
      ],
    });

    renderAllPosts();

    expect(await screen.findByText("1/3")).toBeTruthy();
    expect(screen.getAllByLabelText(/Go to image/i)).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(await screen.findByText("2/3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(await screen.findByText("1/3")).toBeTruthy();
  });
});
