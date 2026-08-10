// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ForYouPosts from "@/components/allposts/ForYouPosts";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => opts?.defaultValue || key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

// ── Default props ─────────────────────────────────────────

const defaultProps = {
  forYouHeroExpanded: true,
  onToggleHeroExpanded: vi.fn(),
  resultsCount: 42,
  subcategoryCount: 5,
  activeFiltersCount: 2,
  onBrowseFeed: vi.fn(),
  onShuffle: vi.fn(),
  canShuffle: true,
  isAuthenticated: true,
  onClearFilters: vi.fn(),
  hasActiveFilters: true,
  autoRefreshEnabled: false,
  onToggleAutoRefresh: vi.fn(),
  onSwitchToAllPosts: vi.fn(),
  setLoginPromptOpen: vi.fn(),
  pageMaxWidthClass: "max-w-[640px]",
  contentTopOffset: 56,
  feedNode: null,
  dealsBannerNode: null,
  children: null,
};

function renderForYouPosts(props = {}) {
  return render(<ForYouPosts {...defaultProps} {...props} />);
}

// ── Tests ──────────────────────────────────────────────────

describe("ForYouPosts", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders 'Your Interests' header when expanded", () => {
    renderForYouPosts();
    expect(screen.getByText("Your Interests")).toBeTruthy();
  });

  it("renders expand/collapse toggle with aria-expanded=true", () => {
    renderForYouPosts();
    const toggle = screen.getByRole("button", { name: /your interests/i });
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows 'AI curated' badge when expanded", () => {
    renderForYouPosts();
    expect(screen.getByText("AI curated")).toBeTruthy();
  });

  it("shows 'For You' heading when expanded", () => {
    renderForYouPosts();
    expect(screen.getByText("For You")).toBeTruthy();
  });

  it("displays stats grid with results count", () => {
    renderForYouPosts({ resultsCount: 99 });
    expect(screen.getByText("99")).toBeTruthy();
    expect(screen.getByText("Matched")).toBeTruthy();
  });

  it("displays categories count in stats", () => {
    renderForYouPosts({ subcategoryCount: 7 });
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("Categories")).toBeTruthy();
  });

  it("displays active filters count in stats", () => {
    renderForYouPosts({ activeFiltersCount: 3 });
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Filters")).toBeTruthy();
  });

  it("shows 0 for resultsCount when not finite", () => {
    renderForYouPosts({ resultsCount: NaN });
    expect(screen.getByText("0")).toBeTruthy();
  });

  it("renders 'Browse' button and calls onBrowseFeed on click", () => {
    const onBrowseFeed = vi.fn();
    renderForYouPosts({ onBrowseFeed });
    const browseBtn = screen.getByText("Browse");
    expect(browseBtn).toBeTruthy();
    fireEvent.click(browseBtn);
    expect(onBrowseFeed).toHaveBeenCalledTimes(1);
  });

  it("calls onShuffle when Shuffle clicked and authenticated", () => {
    const onShuffle = vi.fn();
    renderForYouPosts({ onShuffle, isAuthenticated: true, canShuffle: true });
    const shuffleBtn = screen.getByText("Shuffle");
    expect(shuffleBtn).toBeTruthy();
    expect(shuffleBtn.disabled).toBe(false);
    fireEvent.click(shuffleBtn);
    expect(onShuffle).toHaveBeenCalledTimes(1);
  });

  it("opens login prompt when unauthenticated user clicks Shuffle", () => {
    const setLoginPromptOpen = vi.fn();
    renderForYouPosts({ isAuthenticated: false, setLoginPromptOpen });
    const shuffleBtn = screen.getByText("Shuffle");
    expect(shuffleBtn.disabled).toBe(false);
    fireEvent.click(shuffleBtn);
    expect(setLoginPromptOpen).toHaveBeenCalledWith(true);
  });

  it("disables Shuffle button when authenticated but cannot shuffle", () => {
    renderForYouPosts({ isAuthenticated: true, canShuffle: false });
    const shuffleBtn = screen.getByText("Shuffle");
    expect(shuffleBtn.disabled).toBe(true);
  });

  it("renders 'Live' toggle and calls onToggleAutoRefresh on click", () => {
    const onToggleAutoRefresh = vi.fn();
    renderForYouPosts({ onToggleAutoRefresh, autoRefreshEnabled: false });
    const liveBtn = screen.getByText("Live");
    expect(liveBtn).toBeTruthy();
    fireEvent.click(liveBtn);
    expect(onToggleAutoRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows 'Live on' label when autoRefreshEnabled is true", () => {
    renderForYouPosts({ autoRefreshEnabled: true });
    expect(screen.getByText("Live on")).toBeTruthy();
  });

  it("does not show clear filters button when hasActiveFilters is false", () => {
    renderForYouPosts({ hasActiveFilters: false });
    expect(screen.queryByText("Clear filters")).toBeFalsy();
  });

  it("shows clear filters and calls onClearFilters when hasActiveFilters", () => {
    const onClearFilters = vi.fn();
    renderForYouPosts({ hasActiveFilters: true, onClearFilters });
    const clearBtn = screen.getByText("Clear filters");
    expect(clearBtn).toBeTruthy();
    fireEvent.click(clearBtn);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("calls onSwitchToAllPosts when 'All Posts' button is clicked", () => {
    const onSwitchToAllPosts = vi.fn();
    renderForYouPosts({ onSwitchToAllPosts });
    const allPostsBtn = screen.getByText("All Posts");
    expect(allPostsBtn).toBeTruthy();
    fireEvent.click(allPostsBtn);
    expect(onSwitchToAllPosts).toHaveBeenCalledTimes(1);
  });

  it("renders children when provided", () => {
    render(
      <ForYouPosts {...defaultProps}>
        <div data-testid="child-content">Child content</div>
      </ForYouPosts>
    );
    expect(screen.getByTestId("child-content")).toBeTruthy();
    expect(screen.getByText("Child content")).toBeTruthy();
  });

  it("collapses content when forYouHeroExpanded is false", () => {
    renderForYouPosts({ forYouHeroExpanded: false });
    expect(screen.queryByText("AI curated")).toBeFalsy();
    expect(screen.queryByText("For You")).toBeFalsy();
    expect(screen.getByText("Your Interests")).toBeTruthy();
  });

  it("sets aria-expanded=false when collapsed", () => {
    renderForYouPosts({ forYouHeroExpanded: false });
    const toggle = screen.getByRole("button", { name: /your interests/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("calls onToggleHeroExpanded when header is clicked", () => {
    const onToggleHeroExpanded = vi.fn();
    renderForYouPosts({ onToggleHeroExpanded });
    const toggle = screen.getByRole("button", { name: /your interests/i });
    fireEvent.click(toggle);
    expect(onToggleHeroExpanded).toHaveBeenCalledTimes(1);
  });

  it("applies padding-top: 0px when expanded", () => {
    renderForYouPosts({ forYouHeroExpanded: true });
    const paddedDiv = document.querySelector('[style*="padding-top"]');
    expect(paddedDiv).toBeTruthy();
    expect(paddedDiv.style.paddingTop).toBe("0px");
  });

  it("applies contentTopOffset padding when collapsed", () => {
    renderForYouPosts({ forYouHeroExpanded: false, contentTopOffset: 60 });
    const paddedDiv = document.querySelector('[style*="padding-top"]');
    expect(paddedDiv).toBeTruthy();
    expect(paddedDiv.style.paddingTop).toBe("60px");
  });
});
