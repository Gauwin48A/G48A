// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Notifications from "@/pages/Notifications";
import Reviews from "@/pages/Reviews";
import PaymentPage from "@/pages/Payments/PaymentPage";
import SecuritySettings from "@/pages/SecuritySettings";
import Offers from "@/pages/Offers";
import SavedSearches from "@/pages/SavedSearches";
import api from "@/services/api";
import libApi from "@/lib/api";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  authUser: { id: 99, user_id: 99, name: "Test User" },
  authLoading: false,
  toast: vi.fn(),
}));
const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: "en",
      resolvedLanguage: "en",
      changeLanguage: vi.fn(async () => {}),
    },
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => hoisted.navigate,
  };
});

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: hoisted.authUser,
    loading: hoisted.authLoading,
  }),
}));

vi.mock("@/utils/authStorage", () => ({
  getUserId: (user) => String(user?.user_id ?? user?.id ?? ""),
  isAuthenticated: (user) => Boolean(user?.user_id ?? user?.id),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: hoisted.toast,
  }),
}));

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("@/components/PageHeader", () => ({
  default: ({ title, rightAction }) => (
    <div>
      <h1>{title}</h1>
      {rightAction}
    </div>
  ),
}));

vi.mock("@/components/TransactionStepper", () => ({
  default: () => <div>Stepper</div>,
}));

describe("Profile linked pages smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    hoisted.navigate.mockReset();
    hoisted.toast.mockReset();
    hoisted.authUser = { id: 99, user_id: 99, name: "Test User" };
    hoisted.authLoading = false;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("routes wallet notification action to /payment and marks item as read", async () => {
    libApi.get.mockResolvedValueOnce({
      notifications: [
        {
          id: 2,
          title: "Payment Received",
          message: "You got paid",
          read: false,
          action: { label: "View Wallet", path: "/wallet" },
        },
      ],
    });
    libApi.put.mockResolvedValue({});

    render(
      <MemoryRouter future={routerFuture}>
        <Notifications />
      </MemoryRouter>,
    );

    const actionButton = await screen.findByRole("button", { name: "View Wallet" });
    fireEvent.click(actionButton);

    expect(hoisted.navigate).toHaveBeenCalledWith("/payment", {
      state: { fromNotificationFallback: true, originalPath: "/wallet" },
    });
    expect(libApi.put).toHaveBeenCalledWith("/notifications/2/read", { userId: "99" });
  });

  it("redirects unauthenticated review submission to login with return path", async () => {
    hoisted.authUser = null;
    api.get.mockResolvedValueOnce({ reviews: [], stats: { averageRating: 0, totalReviews: 0 } });

    render(
      <MemoryRouter initialEntries={["/reviews/42"]} future={routerFuture}>
        <Routes>
          <Route path="/reviews/:userId" element={<Reviews />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Write a Review");
    fireEvent.click(screen.getByRole("button", { name: "Post Review" }));

    expect(hoisted.navigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/reviews/42" },
    });
  });

  it("supports unwrapped payment API payloads and submits payment", async () => {
    api.get
      .mockResolvedValueOnce({
        upi_id: "merchant@upi",
        merchant_name: "Mhub Merchant",
        tiers: {
          silver: { amount: 99, description: "Silver tier" },
          gold: { amount: 199, description: "Gold tier" },
        },
        instructions: ["Scan and pay", "Submit UTR"],
      })
      .mockResolvedValueOnce({ payments: [] })
      .mockResolvedValueOnce({ payments: [] });
    api.post.mockResolvedValueOnce({ message: "Payment submitted successfully." });

    render(
      <MemoryRouter future={routerFuture}>
        <PaymentPage />
      </MemoryRouter>,
    );

    await screen.findByText("Upgrade Membership");
    fireEvent.change(screen.getByPlaceholderText("Enter UTR"), {
      target: { value: "UTR123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Payment" }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/payments/submit", {
        plan_type: "silver",
        transaction_id: "UTR123456",
        amount: 99,
      });
    });
    expect(await screen.findByText("Payment submitted successfully.")).toBeTruthy();
  });

  it("shows auth gate on security page and routes login button correctly", async () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("user_id");

    render(
      <MemoryRouter future={routerFuture}>
        <SecuritySettings />
      </MemoryRouter>,
    );

    await screen.findByText("Authentication Required");
    fireEvent.click(screen.getByRole("button", { name: "Go to Login" }));

    expect(hoisted.navigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/security" },
    });
  });

  it("redirects unauthenticated helpful vote on reviews to login", async () => {
    hoisted.authUser = null;
    api.get.mockResolvedValueOnce({
      reviews: [
        {
          review_id: 1001,
          reviewer_name: "Test Buyer",
          rating: 5,
          comment: "Great seller",
          helpful_count: 0,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      stats: { averageRating: 5, totalReviews: 1, distribution: { 5: 1 } },
    });

    render(
      <MemoryRouter initialEntries={["/reviews/42"]} future={routerFuture}>
        <Routes>
          <Route path="/reviews/:userId" element={<Reviews />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Great seller");
    fireEvent.click(screen.getByRole("button", { name: /Helpful/i }));

    expect(hoisted.navigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/reviews/42" },
    });
  });

  it("shows auth gate on offers page and routes login button correctly", async () => {
    hoisted.authUser = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("user_id");

    render(
      <MemoryRouter future={routerFuture}>
        <Offers />
      </MemoryRouter>,
    );

    await screen.findByText("Login required");
    fireEvent.click(screen.getByRole("button", { name: "Go to Login" }));

    expect(hoisted.navigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/offers" },
    });
  });

  it("keeps review helpful count stable when backend reports already voted", async () => {
    api.get.mockResolvedValueOnce({
      reviews: [
        {
          review_id: 1001,
          reviewer_name: "Test Buyer",
          rating: 5,
          comment: "Great seller",
          helpful_count: 5,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      stats: { averageRating: 5, totalReviews: 1, distribution: { 5: 1 } },
    });
    api.patch.mockResolvedValueOnce({ alreadyVoted: true, helpfulCount: 5 });

    render(
      <MemoryRouter initialEntries={["/reviews/42"]} future={routerFuture}>
        <Routes>
          <Route path="/reviews/:userId" element={<Reviews />} />
        </Routes>
      </MemoryRouter>,
    );

    const helpfulButton = await screen.findByRole("button", { name: /Helpful \(5\)/i });
    fireEvent.click(helpfulButton);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/reviews/1001/helpful");
    });
    expect(screen.getByRole("button", { name: /Helpful \(5\)/i })).toBeTruthy();
  });

  it("loads offers using canonical /offers route and submits actions to /offers/:id", async () => {
    localStorage.setItem("authToken", "token");
    localStorage.setItem("userId", "99");

    libApi.get.mockResolvedValue({
      offers: [
        {
          offer_id: 1,
          status: "pending",
          post_title: "Offer Item",
          original_price: 1000,
          offered_price: 900,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    libApi.patch.mockResolvedValueOnce({});

    render(
      <MemoryRouter future={routerFuture}>
        <Offers />
      </MemoryRouter>,
    );

    await screen.findByText("Offer Item");
    expect(screen.getByText("₹900")).toBeTruthy();
    expect(libApi.get).toHaveBeenCalledWith("/offers", { params: { role: "seller" } });
    expect(libApi.get.mock.calls.some(([url]) => String(url).startsWith("/api/offers"))).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => {
      expect(libApi.patch).toHaveBeenCalledWith("/offers/1", { action: "accept" });
    });
    expect(libApi.patch.mock.calls.some(([url]) => String(url).startsWith("/api/offers"))).toBe(false);
  });

  it("toggles saved-search notifications via /saved-searches/:id/notifications", async () => {
    libApi.get.mockResolvedValueOnce({
      searches: [
        {
          search_id: 11,
          name: "Cheap iPhones",
          search_query: "iphone",
          location: "Delhi",
          notification_enabled: false,
        },
      ],
    });
    libApi.patch.mockResolvedValueOnce({});

    render(
      <MemoryRouter future={routerFuture}>
        <SavedSearches />
      </MemoryRouter>,
    );

    const title = await screen.findByText("Cheap iPhones");
    const itemContainer = title.closest(".p-4");
    const rowButtons = within(itemContainer).getAllByRole("button");
    fireEvent.click(rowButtons[0]);

    await waitFor(() => {
      expect(libApi.patch).toHaveBeenCalledWith("/saved-searches/11/notifications", {});
    });
  });
});
