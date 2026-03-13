// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "@/pages/Profile";
import { fetchCategoriesCached } from "@/services/categoriesService";

const hoisted = vi.hoisted(() => ({
  serviceGet: vi.fn(),
  servicePost: vi.fn(),
  libGet: vi.fn(),
  getChannelByUser: vi.fn(),
  authState: {
    user: { id: "42", role: "user" },
    setUser: vi.fn(),
    loading: false,
    refreshAuth: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => hoisted.authState,
}));

vi.mock("@/services/api", () => ({
  default: {
    get: (...args) => hoisted.serviceGet(...args),
    post: (...args) => hoisted.servicePost(...args),
  },
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: (...args) => hoisted.libGet(...args),
  },
  getChannelByUser: (...args) => hoisted.getChannelByUser(...args),
}));

vi.mock("@/services/categoriesService", () => ({
  fetchCategoriesCached: vi.fn(),
}));

describe("Profile missing-name payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("authToken", "token-123");
    localStorage.setItem("userId", "42");

    fetchCategoriesCached.mockResolvedValue([]);
    hoisted.getChannelByUser.mockResolvedValue(null);

    hoisted.serviceGet.mockImplementation((url) => {
      if (url === "/profile") {
        return Promise.resolve({
          id: "42",
          name: null,
          full_name: null,
          email: "test@example.com",
          created_at: "2026-03-01T00:00:00.000Z",
        });
      }
      if (String(url).startsWith("/profile/preferences")) {
        return Promise.resolve({
          location: "",
          minPrice: "",
          maxPrice: "",
          categories: [],
        });
      }
      if (String(url).startsWith("/posts/mine")) {
        return Promise.resolve({ total: 0, posts: [] });
      }
      if (String(url).startsWith("/rewards/user/")) {
        return Promise.resolve({ tier: "Bronze" });
      }
      return Promise.resolve({});
    });

    hoisted.servicePost.mockResolvedValue({});
  });

  it("renders without crashing and shows fallback initials", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("profile")).toBeInTheDocument();
    });

    const initials = screen.getAllByText(/^U$/);
    expect(initials.length).toBeGreaterThan(0);
  });
});
