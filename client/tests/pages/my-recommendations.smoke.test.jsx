// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyRecommendations from "@/pages/MyRecommendations";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  apiGet: vi.fn(),
  authUser: { id: "51", user_id: "51", name: "Reco User" },
  accessToken: "token-xyz",
  userId: "51",
}));

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

vi.mock("@/utils/authStorage", () => ({
  getAccessToken: () => hoisted.accessToken,
  getUserId: () => hoisted.userId,
}));

vi.mock("@/lib/networkConfig", () => ({
  getApiOriginBase: () => "http://localhost:5001",
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: (...args) => hoisted.apiGet(...args),
  },
}));

vi.mock("@/hooks/useTranslatedContent", () => ({
  useTranslatedPosts: (posts) => ({ translatedPosts: posts }),
}));

vi.mock("@/components/CategoriesGrid", () => ({
  default: ({ onCategorySelect }) => (
    <button type="button" onClick={() => onCategorySelect("Electronics")}>
      choose-electronics
    </button>
  ),
}));

vi.mock("@/components/ShareLinkDialog", () => ({
  default: ({ open, url }) =>
    open ? <div data-testid="reco-share-dialog">share:{url}</div> : null,
}));

function renderRecommendations() {
  return render(
    <MemoryRouter>
      <MyRecommendations />
    </MemoryRouter>,
  );
}

describe("MyRecommendations smoke", () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    localStorage.clear();
    vi.clearAllMocks();
    hoisted.authUser = { id: "51", user_id: "51", name: "Reco User" };
    hoisted.accessToken = "token-xyz";
    hoisted.userId = "51";
    hoisted.apiGet.mockImplementation(async (url) => {
      if (String(url).startsWith("/profile/preferences")) {
        return {};
      }
      if (String(url) === "/recommendations") {
        return {
          posts: [],
        };
      }
      return {};
    });
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    globalThis.fetch = originalFetch;
  });

  it("shows auth gate and routes to login when unauthenticated", async () => {
    hoisted.authUser = null;
    hoisted.accessToken = null;
    hoisted.userId = null;

    renderRecommendations();

    expect(await screen.findByText("access_restricted")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "sign_in_to_continue" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/my-recommendations" },
    });
  });

  it("recovers from recommendations fetch error and keeps post actions working", async () => {
    let recommendAttempts = 0;
    hoisted.apiGet.mockImplementation(async (url) => {
      if (String(url).startsWith("/profile/preferences")) {
        throw new Error("preferences-unavailable");
      }
      if (String(url) === "/recommendations") {
        recommendAttempts += 1;
        if (recommendAttempts === 1) {
          throw new Error("recommendations-down");
        }
        return {
          posts: [
            {
              post_id: 88,
              title: "Recovered Recommendation",
              description: "Recovered recommendation description",
              price: 4500,
              category_name: "Electronics",
              location: "Hyderabad",
              user: { name: "Reco Seller" },
              images: [],
            },
          ],
        };
      }
      return {};
    });

    renderRecommendations();

    expect(await screen.findByText("Failed to load recommendations")).toBeTruthy();
    const retryButton = screen.queryByRole("button", { name: "Retry" });
    if (retryButton) {
      fireEvent.click(retryButton);
    }

    expect(await screen.findByRole("button", { name: "view" })).toBeTruthy();
    expect(recommendAttempts).toBeGreaterThanOrEqual(2);

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "view" }));
    expect(hoisted.navigate).toHaveBeenCalledWith("/post/88");
  });

  it("sends selected category in recommendations request params", async () => {
    hoisted.apiGet.mockImplementation(async (url, options) => {
      if (String(url).startsWith("/profile/preferences")) {
        return {};
      }
      if (String(url) === "/recommendations") {
        return {
          posts: [
            {
              post_id: 188,
              title: "Category Driven Post",
              description: "desc",
              price: 2000,
              category_name: options?.params?.category || "General",
              location: "Delhi",
              user: { name: "Seller" },
              images: [],
            },
          ],
        };
      }
      return {};
    });

    renderRecommendations();
    await waitFor(() => {
      expect(hoisted.apiGet).toHaveBeenCalledWith(
        "/recommendations",
        expect.objectContaining({
          params: expect.objectContaining({
            userId: "51",
          }),
        }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "choose-electronics" }));

    await waitFor(() => {
      expect(hoisted.apiGet).toHaveBeenCalledWith(
        "/recommendations",
        expect.objectContaining({
          params: expect.objectContaining({
            category: "Electronics",
          }),
        }),
      );
    });
  });
});
