// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NotificationsPage from "@/pages/Notifications";
import RecentlyViewed from "@/pages/RecentlyViewed";
import MyHomePage from "@/pages/MyHome";

const translationMock = {
  t: (key, options = {}) => {
    const map = {
      my_home_title: "My Home",
      my_home_label: "My Home",
    };
    return options?.defaultValue || map[key] || key;
  },
  i18n: { language: "en" },
};

vi.mock("react-i18next", () => ({
  useTranslation: () => translationMock,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Test User" },
    loading: false,
    isAuthenticated: true,
  }),
}));

vi.mock("@/context/CategoryModeContext", () => ({
  useCategoryMode: () => ({
    activeCategory: null,
    activeApp: null,
    categories: [],
    hasSelection: false,
  }),
}));

vi.mock("@/utils/authStorage", () => ({
  getUserId: () => "user-1",
  getAccessToken: () => "token-123",
  isAuthenticated: () => true,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/usePullToRefresh", () => ({
  usePullToRefresh: () => ({
    pullIndicator: null,
    refreshing: false,
    pullDistance: 0,
  }),
}));

vi.mock("@/utils/translateContent", () => ({
  translatePosts: vi.fn(async (posts) => posts),
  translatePostsInstant: vi.fn((posts) => posts),
}));

vi.mock("@/utils/savedPosts", () => ({
  buildSavedPostsMap: () => ({}),
  beginSavedPostMutation: () => true,
  endSavedPostMutation: () => {},
  fetchWishlistIds: vi.fn(async () => []),
  getSavedPostsMap: () => ({}),
  setSavedPostStatus: () => {},
  subscribeSavedPosts: () => () => {},
}));

vi.mock("@/hooks/useTranslatedContent", () => ({
  useTranslatedPosts: (items) => ({ translatedPosts: items }),
}));

vi.mock("@/components/PageHeader", () => ({
  default: ({ title, rightAction }) => (
    <div>
      {title ? <span>{title}</span> : null}
      {rightAction}
    </div>
  ),
}));

vi.mock("@/components/SellerTrustBadges", () => ({
  default: () => null,
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "@/lib/api";
import serviceApi from "@/services/api";

const apiMock = api;
const serviceApiMock = serviceApi;

vi.mock("@/lib/socket", () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

describe("Notifications / Recently Viewed / My Home smoke", () => {
  let setIntervalSpy;
  let clearIntervalSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    setIntervalSpy = vi
      .spyOn(globalThis, "setInterval")
      .mockImplementation(() => 0);
    clearIntervalSpy = vi
      .spyOn(globalThis, "clearInterval")
      .mockImplementation(() => {});
    const handler = (url) => {
      if (url === "/notifications") {
        return Promise.resolve({
          data: {
            notifications: [
              {
                id: "notif-1",
                title: "Price drop alert",
                message: "Your saved item dropped in price.",
                created_at: new Date().toISOString(),
                read: false,
                icon: "trending",
                sender_name: "MHub",
              },
            ],
            unreadCount: 1,
            hasMore: false,
          },
        });
      }
      if (url === "/recently-viewed") {
        return Promise.resolve({
          data: {
            items: [
              {
                post_id: "post-1",
                title: "Vintage Camera",
                price: 2500,
                status: "active",
                source: "allposts",
                image_url: "/placeholder.svg",
                viewed_at: new Date().toISOString(),
              },
            ],
            hasMore: false,
          },
        });
      }
      if (url === "/posts/mine") {
        return Promise.resolve({ data: { posts: [] } });
      }
      if (url === "/posts/mine/totals") {
        return Promise.resolve({
          data: { totals: { total: 0, active: 0, sold: 0, bought: 0 } },
        });
      }
      return Promise.resolve({ data: {} });
    };
    apiMock.get.mockImplementation(handler);
    serviceApiMock.get.mockImplementation(handler);
    globalThis.__MHUB_TEST_RECENTLY_VIEWED__ = [
      {
        post_id: "post-1",
        title: "Vintage Camera",
        price: 2500,
        status: "active",
        source: "allposts",
        image_url: "/placeholder.svg",
        viewed_at: new Date().toISOString(),
      },
    ];
  });

  afterEach(() => {
    cleanup();
    setIntervalSpy?.mockRestore();
    clearIntervalSpy?.mockRestore();
    delete globalThis.__MHUB_TEST_RECENTLY_VIEWED__;
  });

  it("renders notifications list with fetched data", async () => {
    render(
      <MemoryRouter initialEntries={["/notifications"]}>
        <NotificationsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Price drop alert")).toBeTruthy();
    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith(
        "/notifications",
        expect.any(Object),
      ),
    );
  });

  it("renders recently viewed items", async () => {
    render(
      <MemoryRouter initialEntries={["/recently-viewed"]}>
        <RecentlyViewed />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Vintage Camera")).toBeTruthy();
  });

  it("renders My Home header when authenticated", async () => {
    render(
      <MemoryRouter initialEntries={["/my-home"]}>
        <Routes>
          <Route path="/my-home" element={<MyHomePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("My Home")).toBeTruthy();
    await waitFor(() =>
      expect(serviceApiMock.get).toHaveBeenCalledWith(
        "/posts/mine",
        expect.any(Object),
      ),
    );
  });
});
