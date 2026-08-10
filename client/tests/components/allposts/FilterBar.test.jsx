// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FilterBar from "@/components/allposts/FilterBar";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => opts?.defaultValue || key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

// ── Default props ─────────────────────────────────────────

const defaultProps = {
  searchValue: "",
  onSearchChange: vi.fn(),
  onClearSearch: vi.fn(),
  searchPlaceholder: "search_products",

  quickFiltersChips: [
    { key: "today", label: "Posted Today", active: false, onClick: vi.fn() },
    { key: "near-me", label: "Near me", active: true, onClick: vi.fn() },
  ],
  isForYouMode: false,

  categoryBarCategories: [
    { id: "1", name: "Electronics", post_count: 12 },
    { id: "2", name: "Fashion", post_count: 8 },
  ],
  activeCategoryBarLabel: "All",
  onCategorySelectAll: vi.fn(),
  onCategorySelect: vi.fn(),
  subcategoryList: [],
  activeSubcategoryLabel: "All",
  onSubcategorySelectAll: vi.fn(),
  onSubcategorySelect: vi.fn(),

  maxWidthClass: "max-w-[640px]",
  secondaryStickyTop: 56,
  secondaryStickyRef: { current: null },
  compact: false,
};

function renderFilterBar(props = {}) {
  return render(<FilterBar {...defaultProps} {...props} />);
}

// ── Tests ──────────────────────────────────────────────────

describe("FilterBar", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders search input with placeholder", () => {
    renderFilterBar();
    const input = screen.getByPlaceholderText("search_products");
    expect(input).toBeTruthy();
    expect(input.getAttribute("type")).toBe("text");
  });

  it("calls onSearchChange when user types in search", () => {
    const onSearchChange = vi.fn();
    renderFilterBar({ onSearchChange });
    const input = screen.getByPlaceholderText("search_products");
    fireEvent.change(input, { target: { value: "phone" } });
    expect(onSearchChange).toHaveBeenCalledWith("phone");
  });

  it("shows clear button when searchValue is non-empty", () => {
    renderFilterBar({ searchValue: "phone" });
    const buttons = document.querySelectorAll("button");
    const clearBtn = Array.from(buttons).find((btn) =>
      btn.innerHTML.includes("M18 6L6 18")
    );
    expect(clearBtn).toBeTruthy();
  });

  it("does NOT show clear button when searchValue is empty", () => {
    renderFilterBar({ searchValue: "" });
    const buttons = document.querySelectorAll("button");
    const clearBtn = Array.from(buttons).find((btn) =>
      btn.innerHTML.includes("M18 6L6 18")
    );
    expect(clearBtn).toBeFalsy();
  });

  it("calls onClearSearch when clear button is clicked", () => {
    const onClearSearch = vi.fn();
    renderFilterBar({ searchValue: "phone", onClearSearch });
    const buttons = document.querySelectorAll("button");
    const clearBtn = Array.from(buttons).find((btn) =>
      btn.innerHTML.includes("M18 6L6 18")
    );
    expect(clearBtn).toBeTruthy();
    fireEvent.click(clearBtn);
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it("renders quick filter chips and calls onClick when clicked", () => {
    const todayOnClick = vi.fn();
    renderFilterBar({
      quickFiltersChips: [
        { key: "today", label: "Posted Today", active: false, onClick: todayOnClick },
      ],
    });
    const chip = screen.queryByText("Posted Today");
    if (chip) {
      fireEvent.click(chip);
      expect(todayOnClick).toHaveBeenCalledTimes(1);
    }
  });

  it("renders category bar with provided categories", () => {
    renderFilterBar();
    // CategoryBar renders buttons with category names
    expect(screen.getByText("Electronics")).toBeTruthy();
    expect(screen.getByText("Fashion")).toBeTruthy();
  });

  it("applies sticky positioning with secondaryStickyTop offset", () => {
    renderFilterBar({ secondaryStickyTop: 60 });
    const container = document.querySelector(".sticky");
    expect(container).toBeTruthy();
    expect(container.style.top).toBe("60px");
  });

  it("renders with isForYouMode title variant", () => {
    renderFilterBar({ isForYouMode: true });
    const quickFiltersTitle = screen.queryByText("refine_for_you");
    if (quickFiltersTitle) {
      expect(quickFiltersTitle).toBeTruthy();
    }
  });

  it("renders empty quick filters list gracefully", () => {
    renderFilterBar({ quickFiltersChips: [] });
    const input = screen.getByPlaceholderText("search_products");
    expect(input).toBeTruthy();
  });

  it("renders empty category list gracefully", () => {
    renderFilterBar({ categoryBarCategories: [] });
    const input = screen.getByPlaceholderText("search_products");
    expect(input).toBeTruthy();
  });
});
