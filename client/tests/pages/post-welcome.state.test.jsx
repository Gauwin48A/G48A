// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PostWelcome from "@/pages/PostWelcome";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  apiGet: vi.fn(),
  user: {
    id: "42",
    user_id: "42",
    current_plan: "silver",
    post_credits: 0,
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

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: hoisted.user,
  }),
}));

vi.mock("@/utils/authStorage", () => ({
  getAccessToken: () => "token-123",
  getUserId: () => "42",
}));

vi.mock("@/utils/appStateEvents", () => ({
  subscribeSubscriptionUpdated: () => () => {},
}));

vi.mock("@/services/api", () => ({
  default: {
    get: (...args) => hoisted.apiGet(...args),
  },
}));

function renderPostWelcome() {
  return render(
    <MemoryRouter future={routerFuture}>
      <PostWelcome />
    </MemoryRouter>,
  );
}

describe("PostWelcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.user = {
      id: "42",
      user_id: "42",
      current_plan: "silver",
      post_credits: 0,
    };
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it("shows retry state on subscription failure and recovers on retry", async () => {
    hoisted.apiGet
      .mockRejectedValueOnce(new Error("Subscription service unavailable"))
      .mockResolvedValueOnce({
        currentPlan: "silver",
        postCredits: 0,
        subscription: {
          planName: "silver",
          isActive: true,
          isTrial: true,
          expiresAt: "2026-03-28T00:00:00.000Z",
        },
      });

    renderPostWelcome();

    expect(
      await screen.findByText("Plan status is temporarily unavailable"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));

    await waitFor(() => {
      expect(screen.getByText("Silver")).toBeTruthy();
    });

    expect(screen.getAllByText(/Trial active/i).length).toBeGreaterThan(0);
  });

  it("routes eligible users into a popular category quick start", async () => {
    hoisted.apiGet.mockResolvedValue({
      currentPlan: "silver",
      postCredits: 0,
      subscription: {
        planName: "silver",
        isActive: true,
        isTrial: false,
        expiresAt: "2026-04-18T00:00:00.000Z",
      },
    });

    renderPostWelcome();

    fireEvent.click(await screen.findByRole("button", { name: "Electronics" }));

    expect(hoisted.navigate).toHaveBeenCalledWith(
      "/category-hub?tier=silver&flow=post&category=Electronics",
    );
  });
});
