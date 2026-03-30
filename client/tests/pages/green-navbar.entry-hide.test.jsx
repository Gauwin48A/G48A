// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FilterProvider } from "@/context/FilterContext";
import GreenNavbar from "@/components/GreenNavbar";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const hoisted = vi.hoisted(() => ({
  fetchCategoriesCached: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) => options?.defaultValue || key,
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}));

vi.mock("@/context/LocationContext", () => ({
  useLocation: () => ({
    city: "Hyderabad",
    displayName: "Hyderabad",
    loading: false,
    permissionGranted: true,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: hoisted.toast,
  }),
}));

vi.mock("@/services/categoriesService", () => ({
  fetchCategoriesCached: (...args) => hoisted.fetchCategoriesCached(...args),
}));

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/utils/authStorage", () => ({
  getAccessToken: () => "",
  getUserId: () => "",
  isAuthenticated: () => false,
}));

vi.mock("@/components/LanguageSelector", () => ({
  default: () => null,
}));

vi.mock("@/components/LocationSelector", () => ({
  default: () => null,
}));

function renderNavbar(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={routerFuture}>
      <FilterProvider>
        <GreenNavbar />
      </FilterProvider>
    </MemoryRouter>,
  );
}

describe("GreenNavbar entry-screen behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.fetchCategoriesCached.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("hides both app navbars on the category hub start screen", () => {
    renderNavbar("/category-hub");

    expect(
      screen.queryByRole("navigation", { name: "main_navigation" }),
    ).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "bottom_navigation" }),
    ).toBeNull();
  });
});
