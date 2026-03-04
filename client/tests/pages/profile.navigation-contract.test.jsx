// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "@/pages/Profile";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  setUser: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: "en",
      resolvedLanguage: "en",
      changeLanguage: vi.fn(async () => {}),
    },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => hoisted.navigate,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 42,
      user_id: 42,
      name: "Test User",
      email: "test@example.com",
      role: "member",
      verified: true,
      created_at: "2025-01-01T00:00:00.000Z",
    },
    setUser: hoisted.setUser,
    loading: false,
  }),
}));

vi.mock("@/utils/authStorage", () => ({
  getAccessToken: () => "token-123",
  getUserId: (user) => String(user?.user_id ?? user?.id ?? ""),
  isAuthenticated: () => true,
}));

vi.mock("@/services/categoriesService", () => ({
  fetchCategoriesCached: vi.fn(async () => [
    { category_id: 1, name: "Electronics" },
    { category_id: 2, name: "Fashion" },
  ]),
}));

vi.mock("@/lib/api", () => ({
  getChannelByUser: vi.fn(async () => null),
}));

vi.mock("@/lib/profileSync", () => ({
  mergeProfileIntoAuthUser: (_authUser, profileData) => profileData,
  hasUserSnapshotChanged: () => false,
}));

vi.mock("@/services/api", () => ({
  default: {
    get: (...args) => hoisted.apiGet(...args),
    post: (...args) => hoisted.apiPost(...args),
  },
}));

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

describe("Profile navigation contract", () => {
  beforeEach(() => {
    hoisted.navigate.mockReset();
    hoisted.setUser.mockReset();
    hoisted.apiPost.mockReset();

    hoisted.apiGet.mockImplementation(async (url) => {
      if (url === "/profile") {
        return {
          id: 42,
          user_id: 42,
          name: "Test User",
          email: "test@example.com",
          role: "member",
          verified: true,
          created_at: "2025-01-01T00:00:00.000Z",
        };
      }
      if (url === "/profile/preferences") return { location: "", categories: [] };
      if (String(url).startsWith("/posts/mine")) return { total: 0, posts: [] };
      if (String(url).startsWith("/rewards/user/")) return { tier: "Bronze" };
      return {};
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("routes all primary profile actions to live routes", async () => {
    renderProfile();
    await screen.findByText("My Reviews");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("btn_sale_done"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/saledone");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("btn_sale_undone"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/saleundone");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("my_home"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/my-home");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("my_feed"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/my-feed");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("My Reviews"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/reviews/42");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("My Offers"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/offers");
  });

  it("routes settings cards to their expected destinations", async () => {
    renderProfile();
    await screen.findByText("My Reviews");

    const settingsTab = screen.getByRole("tab", { name: /settings/i });
    fireEvent.mouseDown(settingsTab);
    fireEvent.click(settingsTab);
    expect(settingsTab.getAttribute("data-state")).toBe("active");
    await screen.findByText("find_friends");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("security_settings"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/security");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("notifications"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/notifications");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("privacy_security"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/security");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("payment_methods"));
    expect(hoisted.navigate).toHaveBeenCalledWith("/payment");
  });
});
