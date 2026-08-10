// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RegularPosts from "@/components/allposts/RegularPosts";

// ── Mocks ──────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => opts?.defaultValue || key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

// ── Default props ─────────────────────────────────────────
// NOTE: showInfiniteScrollSentinel must be a ref-like object or false,
// because the component uses it as both a boolean AND a React ref.

const defaultProps = {
  heroContextLabel: "Trending Now",
  heroTitle: "Discover the Best Deals",
  heroSubtitle: "Handpicked items just for you",
  resultsCount: 24,
  onNavigateFeed: vi.fn(),

  feedNode: null,
  children: null,

  hasMore: true,
  isLoading: false,
  isError: false,
  onLoadMore: vi.fn(),
  showLoadMoreButton: true,
  showInfiniteScrollSentinel: false, // false to avoid string-ref error when not testing sentinel

  showBackToTop: true,
  onScrollToTop: vi.fn(),

  compareItems: [],
  showComparePanel: false,
  onCloseCompare: vi.fn(),
  onRemoveCompareItem: vi.fn(),
  comparePanelContent: null,

  isStalledLoading: false,
  stalledLoadingLabel: "",

  pageMaxWidthClass: "max-w-[640px]",
  feedMaxWidthClass: "max-w-[640px]",
  contentTopOffset: 56,
};

function renderRegularPosts(props = {}) {
  return render(<RegularPosts {...defaultProps} {...props} />);
}

// ── Tests ──────────────────────────────────────────────────

describe("RegularPosts", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // ─── Hero section ────────────────────────────────────

  it("renders the hero section with context label", () => {
    renderRegularPosts();
    expect(screen.getByText("Trending Now")).toBeTruthy();
  });

  it("renders the hero title", () => {
    renderRegularPosts();
    expect(screen.getByText("Discover the Best Deals")).toBeTruthy();
  });

  it("renders the hero subtitle", () => {
    renderRegularPosts();
    expect(screen.getByText("Handpicked items just for you")).toBeTruthy();
  });

  it("renders marketplace listings badge", () => {
    renderRegularPosts();
    expect(screen.getByText("Marketplace listings")).toBeTruthy();
  });

  it("renders community feed button and calls onNavigateFeed", () => {
    const onNavigateFeed = vi.fn();
    renderRegularPosts({ onNavigateFeed });
    const feedBtn = screen.getByText("Community Feed");
    expect(feedBtn).toBeTruthy();
    fireEvent.click(feedBtn);
    expect(onNavigateFeed).toHaveBeenCalledTimes(1);
  });

  it("renders results count badge when resultsCount > 0", () => {
    renderRegularPosts({ resultsCount: 42 });
    // Text is broken by emoji + whitespace in the DOM: "📦 \n    42\n     \n    items"
    // Use a function matcher to precisely target the stats badge span
    expect(screen.getByText((content) => content.includes("42") && content.includes("items"))).toBeTruthy();
  });

  it("does not render results stats when resultsCount is 0", () => {
    renderRegularPosts({ resultsCount: 0 });
    expect(screen.queryByText("items")).toBeFalsy();
  });

  it("renders 'Live marketplace' badge when resultsCount > 0", () => {
    renderRegularPosts({ resultsCount: 10 });
    // Text is broken by emoji + whitespace in the DOM: "⚡ \n    Live marketplace"
    expect(screen.getByText(/Live marketplace/)).toBeTruthy();
  });

  it("applies contentTopOffset padding to hero section", () => {
    renderRegularPosts({ contentTopOffset: 64 });
    const paddedDiv = document.querySelector('[style*="padding-top"]');
    expect(paddedDiv).toBeTruthy();
    expect(paddedDiv.style.paddingTop).toBe("64px");
  });

  // ─── Feed children ───────────────────────────────────

  it("renders children inside the feed container", () => {
    render(
      <RegularPosts {...defaultProps}>
        <div data-testid="feed-child">Post card</div>
      </RegularPosts>
    );
    expect(screen.getByTestId("feed-child")).toBeTruthy();
  });

  it("renders feedNode when children are not provided", () => {
    renderRegularPosts({
      children: null,
      feedNode: <div data-testid="feed-node">Feed node content</div>,
    });
    expect(screen.getByTestId("feed-node")).toBeTruthy();
  });

  // ─── Load more ───────────────────────────────────────

  it("renders load more button when hasMore and not loading", () => {
    renderRegularPosts({ hasMore: true, isLoading: false, isError: false });
    expect(screen.getByText("Load more posts")).toBeTruthy();
  });

  it("does NOT render load more button when hasMore is false", () => {
    renderRegularPosts({ hasMore: false });
    expect(screen.queryByText("Load more posts")).toBeFalsy();
  });

  it("does NOT render load more button when isLoading", () => {
    renderRegularPosts({ hasMore: true, isLoading: true });
    expect(screen.queryByText("Load more posts")).toBeFalsy();
  });

  it("does NOT render load more button when isError", () => {
    renderRegularPosts({ hasMore: true, isError: true });
    expect(screen.queryByText("Load more posts")).toBeFalsy();
  });

  it("calls onLoadMore when load more button is clicked", () => {
    const onLoadMore = vi.fn();
    renderRegularPosts({ onLoadMore });
    const loadBtn = screen.getByText("Load more posts");
    fireEvent.click(loadBtn);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  // ─── Infinite scroll sentinel ────────────────────────

  it("renders infinite scroll sentinel with ref-like object", () => {
    renderRegularPosts({
      showInfiniteScrollSentinel: { current: null },
    });
    const sentinelDivs = document.querySelectorAll('[aria-hidden="true"]');
    expect(sentinelDivs.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Stalled loading ─────────────────────────────────

  it("shows stalled loading indicator when isStalledLoading is true", () => {
    renderRegularPosts({ isStalledLoading: true });
    expect(screen.getByText("Still loading...")).toBeTruthy();
  });

  it("shows custom stalled loading label when provided", () => {
    renderRegularPosts({ isStalledLoading: true, stalledLoadingLabel: "Fetching..." });
    expect(screen.getByText("Fetching...")).toBeTruthy();
  });

  it("hides stalled loading when not stalled", () => {
    renderRegularPosts({ isStalledLoading: false });
    expect(screen.queryByText("Still loading...")).toBeFalsy();
  });

  // ─── Back to top ─────────────────────────────────────

  it("shows back-to-top button when showBackToTop is true", () => {
    renderRegularPosts({ showBackToTop: true });
    const btn = screen.getByLabelText("Back to top");
    expect(btn).toBeTruthy();
  });

  it("calls onScrollToTop when back-to-top is clicked", () => {
    const onScrollToTop = vi.fn();
    renderRegularPosts({ showBackToTop: true, onScrollToTop });
    const btn = screen.getByLabelText("Back to top");
    fireEvent.click(btn);
    expect(onScrollToTop).toHaveBeenCalledTimes(1);
  });

  it("hides back-to-top when showBackToTop is false", () => {
    renderRegularPosts({ showBackToTop: false });
    expect(screen.queryByLabelText("Back to top")).toBeFalsy();
  });

  // ─── Compare panel ───────────────────────────────────

  it("does NOT show compare panel when false", () => {
    renderRegularPosts({ showComparePanel: false });
    expect(screen.queryByText("Compare Items")).toBeFalsy();
  });

  it("does NOT show compare panel when compareItems empty", () => {
    renderRegularPosts({ showComparePanel: true, compareItems: [] });
    expect(screen.queryByText("Compare Items")).toBeFalsy();
  });

  it("shows compare panel with items when conditions met", () => {
    renderRegularPosts({
      showComparePanel: true,
      compareItems: [{ id: "1" }, { id: "2" }],
      comparePanelContent: <div data-testid="compare-content">Comparison table</div>,
    });
    expect(screen.getByText("Compare Items")).toBeTruthy();
    expect(screen.getByTestId("compare-content")).toBeTruthy();
  });

  it("closes compare panel when clicking the X button", () => {
    const onCloseCompare = vi.fn();
    renderRegularPosts({
      showComparePanel: true,
      compareItems: [{ id: "1" }],
      onCloseCompare,
    });
    const closeBtn = screen.getByLabelText("Close compare");
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);
    expect(onCloseCompare).toHaveBeenCalledTimes(1);
  });

  it("closes compare panel when clicking overlay backdrop", () => {
    const onCloseCompare = vi.fn();
    renderRegularPosts({
      showComparePanel: true,
      compareItems: [{ id: "1" }],
      onCloseCompare,
    });
    const overlay = document.querySelector(".fixed.inset-0");
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay);
    expect(onCloseCompare).toHaveBeenCalledTimes(1);
  });

  it("does NOT close compare panel when clicking inside panel", () => {
    const onCloseCompare = vi.fn();
    renderRegularPosts({
      showComparePanel: true,
      compareItems: [{ id: "1" }],
      onCloseCompare,
      comparePanelContent: <div data-testid="compare-inner">Inner</div>,
    });
    const inner = screen.getByTestId("compare-inner");
    fireEvent.click(inner);
    expect(onCloseCompare).not.toHaveBeenCalled();
  });

  // ─── Edge cases ──────────────────────────────────────

  it("renders with minimal required props without crashing", () => {
    render(
      <RegularPosts
        heroContextLabel=""
        heroTitle=""
        heroSubtitle=""
        resultsCount={0}
        hasMore={false}
        showBackToTop={false}
        showComparePanel={false}
        isStalledLoading={false}
        pageMaxWidthClass=""
        feedMaxWidthClass=""
        contentTopOffset={0}
      />
    );
    expect(document.querySelector(".mhub-allposts-hero")).toBeTruthy();
  });
});
