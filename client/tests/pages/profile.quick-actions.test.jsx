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
  profileResponse: null,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
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
      verified: false,
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

describe("Profile quick actions", () => {
  beforeEach(() => {
    hoisted.navigate.mockReset();
    hoisted.setUser.mockReset();
    hoisted.apiPost.mockReset();
    hoisted.profileResponse = {
      id: 42,
      user_id: 42,
      name: "Test User",
      email: "test@example.com",
      role: "member",
      verified: false,
      created_at: "2025-01-01T00:00:00.000Z",
    };

    hoisted.apiGet.mockImplementation(async (url) => {
      if (url === "/profile") return hoisted.profileResponse;
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

  it("routes verification CTA to /verification for unverified users", async () => {
    renderProfile();
    await screen.findByText("My Reviews");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("verify_now"));

    expect(hoisted.navigate).toHaveBeenCalledWith("/verification");
  });

  it("opens reviews with fallback id when user_id is missing", async () => {
    hoisted.profileResponse = {
      id: 42,
      user_id: null,
      name: "Test User",
      email: "test@example.com",
      role: "member",
      verified: true,
      created_at: "2025-01-01T00:00:00.000Z",
    };

    renderProfile();
    await screen.findByText("My Reviews");

    hoisted.navigate.mockClear();
    fireEvent.click(screen.getByText("My Reviews"));

    expect(hoisted.navigate).toHaveBeenCalledWith("/reviews/42");
  });

});
