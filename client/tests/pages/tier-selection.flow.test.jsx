// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TierSelection from "@/pages/TierSelection";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  apiPost: vi.fn(),
  toast: vi.fn(),
  userId: "42",
  accessToken: "token-123",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
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

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: hoisted.toast,
  }),
}));

vi.mock("@/utils/authStorage", () => ({
  getUserId: () => hoisted.userId,
  getAccessToken: () => hoisted.accessToken,
}));

vi.mock("@/lib/api", () => ({
  default: {
    post: (...args) => hoisted.apiPost(...args),
  },
}));

function renderTierSelection() {
  return render(
    <MemoryRouter future={routerFuture}>
      <TierSelection />
    </MemoryRouter>,
  );
}

describe("TierSelection upgrade flow", () => {
  beforeEach(() => {
    hoisted.navigate.mockReset();
    hoisted.apiPost.mockReset();
    hoisted.toast.mockReset();
    hoisted.userId = "42";
    hoisted.accessToken = "token-123";
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects unauthenticated users to login with return path", () => {
    hoisted.userId = null;
    hoisted.accessToken = null;

    renderTierSelection();
    fireEvent.click(screen.getByRole("button", { name: "Buy 1 Post Credit" }));

    expect(hoisted.navigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/tier-selection" },
    });
    expect(hoisted.apiPost).not.toHaveBeenCalled();
  });

  it("shows upgrade errors and retries the last attempted tier", async () => {
    hoisted.apiPost
      .mockRejectedValueOnce({ response: { data: { error: "Upgrade service unavailable" } } })
      .mockRejectedValueOnce({ response: { data: { error: "Upgrade service unavailable" } } });

    renderTierSelection();

    fireEvent.click(screen.getByRole("button", { name: "Get Silver Access" }));
    const firstError = await screen.findByText("Upgrade service unavailable");
    expect(firstError).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(hoisted.apiPost).toHaveBeenCalledTimes(2);
    });
    expect(hoisted.apiPost).toHaveBeenNthCalledWith(1, "/users/upgrade-tier", {
      tier: "silver",
    });
    expect(hoisted.apiPost).toHaveBeenNthCalledWith(2, "/users/upgrade-tier", {
      tier: "silver",
    });
  });
});
