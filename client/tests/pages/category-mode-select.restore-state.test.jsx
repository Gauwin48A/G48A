// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CategoryModeSelect from "@/pages/CategoryModeSelect";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const hoisted = vi.hoisted(() => ({
  categories: [
    {
      category_id: 1,
      id: 1,
      name: "Electronics",
      category_group: "electronics",
      product_count: 97,
      subcategories: [
        {
          subcategory_id: 11,
          id: 11,
          name: "Mobiles",
          category_id: 1,
          category_name: "Electronics",
          post_count: 5,
        },
      ],
    },
    {
      category_id: 2,
      id: 2,
      name: "Mobiles",
      category_group: "electronics",
      product_count: 12,
      subcategories: [
        {
          subcategory_id: 12,
          id: 12,
          name: "Feature Phones",
          category_id: 2,
          category_name: "Mobiles",
          post_count: 2,
        },
      ],
    },
    {
      category_id: 3,
      id: 3,
      name: "Fashion",
      category_group: "fashion",
      product_count: 42,
      subcategories: [
        {
          subcategory_id: 31,
          id: 31,
          name: "Clothing",
          category_id: 3,
          category_name: "Fashion",
          post_count: 3,
        },
      ],
    },
  ],
  navigate: vi.fn(),
  categoryMode: {
    categories: [],
    loading: false,
    activeCategory: { id: 1, name: "Electronics" },
    selectCategory: vi.fn(),
    selectSubcategory: vi.fn(),
    clearCategory: vi.fn(),
  },
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

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => hoisted.navigate,
  };
});

vi.mock("@/context/CategoryModeContext", () => ({
  useCategoryMode: () => hoisted.categoryMode,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
  }),
}));

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("@/constants/categoryIcons", () => ({
  getCategoryIcon: () => function MockCategoryIcon(props) {
    return <svg aria-hidden="true" {...props} />;
  },
  getSubcategoryIcon: () => function MockSubcategoryIcon(props) {
    return <svg aria-hidden="true" {...props} />;
  },
}));

function renderPage(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={routerFuture}>
      <CategoryModeSelect />
    </MemoryRouter>,
  );
}

describe("CategoryModeSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.categoryMode = {
      categories: hoisted.categories,
      loading: false,
      activeCategory: { id: 1, name: "Electronics" },
      selectCategory: vi.fn(),
      selectSubcategory: vi.fn(),
      clearCategory: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the hub on the top-level category groups without explicit query params", () => {
    renderPage("/category-hub");

    expect(screen.getByText("Pick a category to start")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Back/i })).toBeNull();
    expect(screen.queryByPlaceholderText("Search subcategories")).toBeNull();
  });

  it("routes browse-mode category selections into the listings app", () => {
    renderPage("/category-hub");

    fireEvent.click(screen.getByText("Electronics").closest("button"));

    expect(hoisted.navigate).toHaveBeenCalledWith(
      "/all-posts?category_group=electronics",
    );
  });

  it("still opens the subcategory drill-down for post-flow deep links", () => {
    renderPage("/category-hub?flow=post&category=Electronics");

    expect(screen.queryByText("Pick a category to start")).toBeNull();
    expect(screen.getByRole("button", { name: /Back/i })).toBeTruthy();
    expect(screen.getByPlaceholderText("Search subcategories")).toBeTruthy();
  });
});
