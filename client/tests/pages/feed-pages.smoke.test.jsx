// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeedPage from "@/pages/FeedPage";
import MyFeedPage from "@/pages/MyFeedPage";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  authUser: { id: "42", user_id: "42", name: "Feed Tester" },
}));
const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

let originalFetch;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key, options) => options?.defaultValue || "",
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => hoisted.navigate,
  };
});

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: hoisted.authUser,
    loading: false,
  }),
}));

vi.mock("@/context/CategoryModeContext", () => ({
  useCategoryMode: () => ({
    activeCategory: null,
    activeSubcategory: null,
    activeApp: null,
    categories: [],
    hasSelection: false,
  }),
}));

vi.mock("@/utils/translateContent", () => ({
  translatePosts: async (posts) => posts,
  translatePostsInstant: (posts) => posts,
}));

vi.mock("@/lib/networkConfig", () => ({
  getApiOriginBase: () => "http://localhost:5001",
  getApiRootUrl: () => "http://localhost:5001/api",
  getSocketUrl: () => "http://localhost:5001",
  buildApiPath: (path = "") => `http://localhost:5001/api${path.startsWith("/") ? path : `/${path}`}`,
}));

vi.mock("@/components/LoginPromptModal", () => ({
  default: ({ isOpen }) => (isOpen ? <div>login_prompt_modal</div> : null),
}));

vi.mock("@/components/ShareLinkDialog", () => ({
  default: ({ open, url }) =>
    open ? <div data-testid="share-dialog-open">share-url:{url}</div> : null,
}));

vi.mock("@/components/page-state/PageStateBlocks", () => ({
  PageLoadingState: ({ title, description }) => (
    <div>
      <p>{title}</p>
      <p>{description}</p>
    </div>
  ),
  PageErrorState: ({ title, description, onRetry, retryLabel, secondaryAction }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {onRetry ? <button onClick={onRetry}>{retryLabel || "Retry"}</button> : null}
      {secondaryAction}
    </div>
  ),
  PageEmptyState: ({ title, description, action }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  ),
  PageAuthGateState: ({ title, description, primaryAction, secondaryAction }) => (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      {primaryAction}
      {secondaryAction}
    </div>
  ),
}));

function renderFeedPage() {
  return render(
    <MemoryRouter future={routerFuture}>
      <FeedPage />
    </MemoryRouter>,
  );
}

function renderMyFeedPage() {
  return render(
    <MemoryRouter future={routerFuture}>
      <MyFeedPage />
    </MemoryRouter>,
  );
}

describe("Feed surfaces smoke", () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    localStorage.clear();
    vi.clearAllMocks();
    hoisted.authUser = { id: "42", user_id: "42", name: "Feed Tester" };
    localStorage.setItem("authToken", "token-123");
    localStorage.setItem("userId", "42");
    window.scrollTo = vi.fn();
    window.requestAnimationFrame = vi.fn((callback) => callback());
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ posts: [] }),
    }));
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    globalThis.fetch = originalFetch;
  });

  it("recovers Feed page after initial API failure", async () => {
    let feedAttempt = 0;
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input || "");
      if (url.includes("/api/feed?")) {
        feedAttempt += 1;
        if (feedAttempt === 1) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        return {
          ok: true,
          json: async () => ({
            posts: [
              {
                post_id: 11,
                title: "Recovered Feed Post",
                description: "Recovered description",
                likes: 2,
                views_count: 4,
                created_at: "2026-03-01T10:00:00.000Z",
                user: { name: "Author 1" },
              },
            ],
          }),
        };
      }

      if (url.includes("/api/posts/11/view")) {
        return { ok: true, json: async () => ({}) };
      }

      return { ok: true, json: async () => ({}) };
    });

    renderFeedPage();

    expect(await screen.findByText("Feed unavailable")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Recovered Feed Post")).toBeTruthy();
    expect(feedAttempt).toBeGreaterThanOrEqual(2);
  });

  it("supports Feed page navigation actions", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input || "");
      if (url.includes("/api/feed?")) {
        return {
          ok: true,
          json: async () => ({
            posts: [
              {
                post_id: 91,
                title: "Actionable Feed Post",
                description: "Feed description",
                likes: 5,
                views_count: 8,
                created_at: "2026-03-01T10:00:00.000Z",
                user: { name: "Author 2" },
              },
            ],
          }),
        };
      }
      if (url.includes("/api/posts/91/view")) {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderFeedPage();
    expect(await screen.findByText("Actionable Feed Post")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Following" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Trending" }),
    ).toBeNull();

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "My Feed" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/my-feed");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "View Details" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/feed/91", {
      state: {
        post: expect.objectContaining({ post_id: 91 }),
      },
    });
  });

  it("renders seller, price, and image from mixed feed payload shapes", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input || "");
      if (url.includes("/api/feed?")) {
        return {
          ok: true,
          json: async () => ({
            posts: [
              {
                post_id: 701,
                title: "Retro Camera",
                description: "Test",
                created_at: "2026-03-05T10:00:00.000Z",
                location: "Mumbai",
                user: { name: "Asha Seller" },
                price: 12000,
                image_url: "https://cdn.example.com/camera.jpg",
              },
              {
                id: 702,
                title: "City Bike",
                description: "Test",
                created_at: "2026-03-05T11:00:00.000Z",
                location: "Delhi",
                seller: { name: "Rohan Dealer" },
                listing_price: "7500",
                images: [{ url: "https://cdn.example.com/bike.jpg" }],
              },
              {
                post_id: 703,
                title: "Gaming Chair",
                description: "Test",
                created_at: "2026-03-05T12:00:00.000Z",
                location: "Pune",
                username: "Meera Market",
                amount: 3100,
                media: ["https://cdn.example.com/chair.jpg"],
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderFeedPage();

    expect(await screen.findByText("Asha Seller")).toBeTruthy();
    expect(screen.getByText("₹12,000")).toBeTruthy();
    expect(screen.getByAltText("Retro Camera").getAttribute("src")).toBe(
      "https://cdn.example.com/camera.jpg",
    );

    expect(screen.getByText("Rohan Dealer")).toBeTruthy();
    expect(screen.getByText("₹7,500")).toBeTruthy();
    expect(screen.getByAltText("City Bike").getAttribute("src")).toBe(
      "https://cdn.example.com/bike.jpg",
    );

    expect(screen.getByText("Meera Market")).toBeTruthy();
    expect(screen.getByText("₹3,100")).toBeTruthy();
    expect(screen.getByAltText("Gaming Chair").getAttribute("src")).toBe(
      "https://cdn.example.com/chair.jpg",
    );
  });

  it("shows a guest preview wall and keeps guest feed limited", async () => {
    hoisted.authUser = null;
    localStorage.clear();
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input || "");
      if (url.includes("/api/feed?")) {
        return {
          ok: true,
          json: async () => ({
            posts: Array.from({ length: 6 }, (_, index) => ({
              post_id: index + 1,
              title: `Guest Feed Post ${index + 1}`,
              description: `Guest description ${index + 1}`,
              likes: index,
              views_count: index + 2,
              created_at: "2026-03-01T10:00:00.000Z",
              user: { name: `Author ${index + 1}` },
            })),
          }),
        };
      }

      return { ok: true, json: async () => ({}) };
    });

    renderFeedPage();

    expect(await screen.findByText("Guest Feed Post 1")).toBeTruthy();
    expect(screen.getByText("Guest Feed Post 5")).toBeTruthy();
    expect(screen.queryByText("Guest Feed Post 6")).toBeNull();
    expect(screen.getByText("Preview limit reached")).toBeTruthy();

    expect(
      screen.getByRole("button", { name: "Log in to continue" }),
    ).toBeTruthy();
  });

  it("recovers MyFeed page after initial API failure and keeps actions working", async () => {
    let myFeedAttempt = 0;
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input || "");
      if (url.includes("/api/feed/mine")) {
        myFeedAttempt += 1;
        if (myFeedAttempt === 1) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        return {
          ok: true,
          json: async () => ({
            posts: [
              {
                post_id: 301,
                title: "My Feed Recovery Post",
                description: "Recovered",
                likes: 1,
                views_count: 2,
                created_at: "2026-03-01T11:00:00.000Z",
              },
            ],
          }),
        };
      }

      if (url.includes("/api/posts/301")) {
        return { ok: true, json: async () => ({}) };
      }

      return { ok: true, json: async () => ({}) };
    });

    renderMyFeedPage();

    expect(
      await screen.findByText("Unable to load your feed posts right now. Please retry."),
    ).toBeTruthy();
    const retryOrRefreshButton =
      screen.queryByRole("button", { name: "Retry" }) ||
      screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(retryOrRefreshButton);

    expect(await screen.findByText("My Feed Recovery Post")).toBeTruthy();
    expect(myFeedAttempt).toBeGreaterThanOrEqual(2);

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "New Post" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/feed/feedpostadd");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/feed/301", {
      state: {
        post: expect.objectContaining({ post_id: 301 }),
      },
    });
  }, 15000);

  it("keeps loaded My Feed posts visible when page 2 fails and retries cleanly", async () => {
    let pageTwoAttempt = 0;
    Object.defineProperty(window, "innerHeight", {
      value: 1000,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2500,
      configurable: true,
    });

    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input || "");
      if (url.includes("/api/feed/mine?page=1")) {
        return {
          ok: true,
          json: async () => ({
            posts: Array.from({ length: 10 }, (_, index) => ({
              post_id: 401 + index,
              title:
                index === 0 ? "My Feed Page One Post" : `My Feed Seed Post ${index + 1}`,
              description: "Still visible after pagination failure",
              likes: 4,
              views_count: 9,
              created_at: "2026-03-01T11:00:00.000Z",
            })),
          }),
        };
      }
      if (url.includes("/api/feed/mine?page=2")) {
        pageTwoAttempt += 1;
        if (pageTwoAttempt === 1) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        return {
          ok: true,
          json: async () => ({
            posts: [
              {
                post_id: 402,
                title: "My Feed Page Two Post",
                description: "Loaded after retry",
                likes: 2,
                views_count: 3,
                created_at: "2026-03-02T11:00:00.000Z",
              },
            ],
          }),
        };
      }

      return { ok: true, json: async () => ({}) };
    });

    renderMyFeedPage();

    expect(await screen.findByText("My Feed Page One Post")).toBeTruthy();

    window.scrollY = 1600;
    fireEvent.scroll(window);

    expect(
      await screen.findByText("More posts unavailable"),
    ).toBeTruthy();
    expect(screen.getByText("My Feed Page One Post")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Retry loading more" }),
    );

    expect(await screen.findByText("My Feed Page Two Post")).toBeTruthy();
    expect(pageTwoAttempt).toBe(2);
  });

  it("shows auth-gate links for MyFeed when not logged in", async () => {
    hoisted.authUser = null;
    localStorage.clear();
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ posts: [] }),
    }));

    renderMyFeedPage();

    expect(await screen.findByText("My Feed")).toBeTruthy();
    const loginLink = screen.getByRole("link", { name: "Login to Continue" });
    expect(loginLink.getAttribute("href")).toContain("/login?returnTo=%2Fmy-feed");
  });
});
