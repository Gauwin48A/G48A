// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PostDetail from "@/pages/PostDetail";

const hoisted = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  toast: vi.fn(),
  authUser: null,
}));

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) => options?.defaultValue || key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: hoisted.authUser,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: hoisted.toast,
  }),
}));

vi.mock("@/hooks/useTrustScore", () => ({
  useTrustScore: () => ({}),
  getTrustBadgeClass: () => "",
  normalizeTrustPayload: () => null,
  isComplaintRiskState: () => false,
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: (...args) => hoisted.apiGet(...args),
    post: (...args) => hoisted.apiPost(...args),
    delete: (...args) => hoisted.apiDelete(...args),
  },
}));

vi.mock("@/components/BuyerInterestModal", () => ({
  default: ({ isOpen }) => (isOpen ? <div>buyer_interest_modal</div> : null),
}));

vi.mock("@/components/MakeOfferModal", () => ({
  default: ({ isOpen }) => (isOpen ? <div>make_offer_modal</div> : null),
}));

vi.mock("@/components/BargainActions", () => ({
  default: () => <div>bargain_actions</div>,
}));

vi.mock("@/components/ShareLinkDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/ImageZoomModal", () => ({
  default: () => null,
}));

vi.mock("@/components/PostBoostPanel", () => ({
  default: () => <div>post_boost_panel</div>,
}));

vi.mock("@/components/SponsoredListings", () => ({
  default: () => <div>sponsored_listings</div>,
}));

vi.mock("@/components/PremiumRecommendations", () => ({
  default: () => <div>premium_recommendations</div>,
}));

function renderPostDetail(route) {
  return render(
    <MemoryRouter initialEntries={[route]} future={routerFuture}>
      <Routes>
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/listing/:id" element={<PostDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PostDetail route coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    hoisted.authUser = null;
    hoisted.apiPost.mockResolvedValue({});
    hoisted.apiDelete.mockResolvedValue({});
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("handles malformed listing ids without calling the API", async () => {
    renderPostDetail("/listing/undefined");

    expect(await screen.findByText("Product Not Found")).toBeTruthy();
    expect(screen.getByText("Invalid listing id.")).toBeTruthy();
    expect(hoisted.apiGet).not.toHaveBeenCalled();
  });

  it("shows media fallback when listing has no media", async () => {
    hoisted.apiGet.mockResolvedValue({
      post: {
        id: "123",
        title: "Bare Listing",
        price: 5000,
        created_at: "2026-03-05T10:00:00.000Z",
        user: { name: "Seller" },
      },
    });

    renderPostDetail("/post/123");

    expect(await screen.findByText("Bare Listing")).toBeTruthy();
    expect(screen.getByText("No photo available")).toBeTruthy();
  });

  it("formats string-formatted prices for listing detail", async () => {
    hoisted.apiGet.mockResolvedValue({
      post: {
        id: "555",
        title: "String Price Listing",
        price: "₹12,500",
        created_at: "2026-03-05T12:00:00.000Z",
        user: { name: "Seller" },
        image_url: "https://cdn.example.com/price.jpg",
      },
    });

    renderPostDetail("/post/555");

    expect(await screen.findByText("String Price Listing")).toBeTruthy();
    expect(screen.getAllByText(/₹\s?12,500/).length).toBeGreaterThan(0);
  });
});
