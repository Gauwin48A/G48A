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
    t: (key) => key,
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

vi.mock("@/utils/translateContent", () => ({
  translatePosts: async (posts) => posts,
}));

vi.mock("@/lib/networkConfig", () => ({
  getApiOriginBase: () => "http://localhost:5001",
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

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "my_feed" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/my-feed");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "view_details" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/feed/91", {
      state: {
        post: expect.objectContaining({ post_id: 91 }),
      },
    });
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

    expect(await screen.findByText("Unable to load your feed")).toBeTruthy();
    const retryOrRefreshButton =
      screen.queryByRole("button", { name: "Retry" }) ||
      screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(retryOrRefreshButton);

    expect(await screen.findByText("My Feed Recovery Post")).toBeTruthy();
    expect(myFeedAttempt).toBeGreaterThanOrEqual(2);

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "new_post" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/feed/feedpostadd");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "view" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/feed/301", {
      state: {
        post: expect.objectContaining({ post_id: 301 }),
      },
    });
  }, 15000);

  it("shows auth-gate links for MyFeed when not logged in", async () => {
    hoisted.authUser = null;
    localStorage.clear();
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ posts: [] }),
    }));

    renderMyFeedPage();

    expect(await screen.findByText("my_feed")).toBeTruthy();
    const loginLink = screen.getByRole("link", { name: "login_to_continue" });
    expect(loginLink.getAttribute("href")).toContain("/login?returnTo=%2Fmy-feed");
  });
});
