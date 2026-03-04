// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Notifications from "@/pages/Notifications";
import Reviews from "@/pages/Reviews";
import PaymentPage from "@/pages/Payments/PaymentPage";
import SecuritySettings from "@/pages/SecuritySettings";
import api from "@/services/api";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  authUser: { id: 99, user_id: 99, name: "Test User" },
  authLoading: false,
  toast: vi.fn(),
}));

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
    vi.clearAllMocks();
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
    api.get.mockResolvedValueOnce({
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
    api.put.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>,
    );

    const actionButton = await screen.findByRole("button", { name: "View Wallet" });
    fireEvent.click(actionButton);

    expect(hoisted.navigate).toHaveBeenCalledWith("/payment", {
      state: { fromNotificationFallback: true, originalPath: "/wallet" },
    });
    expect(api.put).toHaveBeenCalledWith("/notifications/2/read", { userId: "99" });
  });

  it("redirects unauthenticated review submission to login with return path", async () => {
    hoisted.authUser = null;
    api.get.mockResolvedValueOnce({ reviews: [], stats: { averageRating: 0, totalReviews: 0 } });

    render(
      <MemoryRouter initialEntries={["/reviews/42"]}>
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
      <MemoryRouter>
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
      <MemoryRouter>
        <SecuritySettings />
      </MemoryRouter>,
    );

    await screen.findByText("Authentication Required");
    fireEvent.click(screen.getByRole("button", { name: "Go to Login" }));

    expect(hoisted.navigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/security" },
    });
  });
});
