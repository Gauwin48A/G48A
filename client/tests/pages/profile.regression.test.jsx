// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Profile from "@/pages/Profile";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  setUser: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  profileResponse: null,
  preferencesResponse: null,
  updateProfileResponse: null,
}));

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

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
      name: "Old Name",
      email: "old@example.com",
      role: "member",
      verified: true,
      created_at: "2025-01-01T00:00:00.000Z",
    },
    setUser: hoisted.setUser,
    loading: false,
  }),
}));

vi.mock("@/context/CategoryModeContext", () => ({
  useCategoryMode: () => ({
    activeCategory: null,
    hasSelection: false,
    categories: [],
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
  mergeProfileIntoAuthUser: (authUser, profileData) => ({
    ...authUser,
    ...profileData,
  }),
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
    <MemoryRouter future={routerFuture}>
      <Profile />
    </MemoryRouter>,
  );
}

describe("Profile regressions", () => {
  beforeEach(() => {
    hoisted.navigate.mockReset();
    hoisted.setUser.mockReset();
    hoisted.apiGet.mockReset();
    hoisted.apiPost.mockReset();

    hoisted.profileResponse = {
      id: 42,
      user_id: 42,
      name: "Old Name",
      full_name: "Old Name",
      email: "old@example.com",
      role: "member",
      verified: true,
      created_at: "2025-01-01T00:00:00.000Z",
    };

    hoisted.preferencesResponse = {
      location: "",
      minPrice: 0,
      maxPrice: 5000,
      categories: [],
    };

    hoisted.updateProfileResponse = {
      full_name: "Updated Name",
    };

    hoisted.apiGet.mockImplementation(async (url) => {
      if (url === "/profile") return hoisted.profileResponse;
      if (url === "/profile/preferences") return hoisted.preferencesResponse;
      if (String(url).startsWith("/posts/mine")) return { total: 0, posts: [] };
      if (String(url).startsWith("/rewards/user/")) {
        return {
          user: {
            rank: "Bronze",
            tier: "Bronze",
            activityStats: {},
          },
        };
      }
      return {};
    });

    hoisted.apiPost.mockImplementation(async (url) => {
      if (url === "/profile/update") return hoisted.updateProfileResponse;
      if (url === "/profile/preferences/update") return hoisted.preferencesResponse;
      return {};
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("updates visible profile name after save when API returns only full_name", async () => {
    renderProfile();

    await screen.findByRole("heading", { name: "Old Name" });
    fireEvent.click(screen.getByText("edit_profile"));

    const fullNameInput = screen.getByLabelText("full_name");
    fireEvent.change(fullNameInput, { target: { value: "Updated Name" } });
    fireEvent.click(screen.getByText("save_changes"));

    await screen.findByRole("heading", { name: "Updated Name" });
  });

  it("preserves zero min price in preferences editor", async () => {
    renderProfile();

    await screen.findByRole("heading", { name: "Old Name" });
    fireEvent.click(screen.getByRole("tab", { name: "preferences" }));
    await screen.findByText("recommendation_preferences");
    fireEvent.click(await screen.findByRole("button", { name: "edit" }));

    const minPriceInput = document.querySelector('input[name="minPrice"]');
    expect(minPriceInput).toBeTruthy();

    await waitFor(() => {
      expect(minPriceInput.value).toBe("0");
    });
  });

  it("keeps settings tab stable when i18n instance is unavailable", async () => {
    renderProfile();

    await screen.findByRole("heading", { name: "Old Name" });
    const settingsTab = screen.getByRole("tab", { name: "settings" });
    fireEvent.mouseDown(settingsTab);
    fireEvent.click(settingsTab);
    expect(settingsTab.getAttribute("data-state")).toBe("active");

    await screen.findByText("account_settings");
  });
});
