// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Subcategories from "@/pages/Subcategories";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  fetchAllSubcategories: vi.fn(),
  categoryMode: {
    selectCategory: vi.fn(),
    selectSubcategory: vi.fn(),
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

vi.mock("@/services/subcategoriesService", () => ({
  fetchAllSubcategories: (...args) => hoisted.fetchAllSubcategories(...args),
}));

vi.mock("@/context/CategoryModeContext", () => ({
  useCategoryMode: () => hoisted.categoryMode,
}));

vi.mock("@/constants/categoryIcons", () => ({
  getCategoryIcon: () => function MockCategoryIcon(props) {
    return <svg aria-hidden="true" {...props} />;
  },
  getSubcategoryIcon: () => function MockSubcategoryIcon(props) {
    return <svg aria-hidden="true" {...props} />;
  },
}));

function renderPage(initialEntry = "/subcategories") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]} future={routerFuture}>
      <Subcategories />
    </MemoryRouter>,
  );
}

describe("Subcategories explorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.categoryMode = {
      selectCategory: vi.fn(),
      selectSubcategory: vi.fn(),
    };
    hoisted.fetchAllSubcategories.mockResolvedValue([
      {
        subcategory_id: 11,
        name: "Mobiles",
        category_id: 1,
        category_name: "Electronics",
        description: "Phones and accessories",
        post_count: 5,
      },
      {
        subcategory_id: 12,
        name: "Laptops",
        category_id: 1,
        category_name: "Electronics",
        description: "Portable computers",
        post_count: 3,
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("loads subcategories from the shared DB-backed service", async () => {
    renderPage();

    expect(hoisted.fetchAllSubcategories).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Mobiles")).toBeTruthy();
    expect(screen.getByText("Laptops")).toBeTruthy();
    expect(screen.getAllByText("Electronics").length).toBeGreaterThan(0);
  });

  it("navigates with category_id and subcategory_id when a subcategory is selected", async () => {
    renderPage();

    fireEvent.click(await screen.findByText("Mobiles"));

    await waitFor(() => {
      expect(hoisted.categoryMode.selectCategory).toHaveBeenCalledWith({
        name: "Electronics",
        category_id: 1,
        id: 1,
      });
      expect(hoisted.categoryMode.selectSubcategory).toHaveBeenCalledWith({
        name: "Mobiles",
        subcategory_id: 11,
        category_id: 1,
      });
      expect(hoisted.navigate).toHaveBeenCalledWith(
        "/all-posts?category_id=1&subcategory_id=11",
      );
    });
  });
});
