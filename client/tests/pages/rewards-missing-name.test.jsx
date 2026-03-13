// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Rewards from "@/pages/Rewards";

const hoisted = vi.hoisted(() => ({
  libGet: vi.fn(),
  authState: {
    user: { id: "42", role: "user" },
    loading: false,
    refreshAuth: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => hoisted.authState,
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: (...args) => hoisted.libGet(...args),
  },
}));

describe("Rewards missing-name payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("authToken", "token-123");
    localStorage.setItem("userId", "42");

    hoisted.libGet.mockImplementation((url) => {
      if (String(url).startsWith("/rewards/log")) {
        return Promise.resolve([]);
      }
      if (String(url).startsWith("/public-wall")) {
        return Promise.resolve({
          topSellers: [],
          topBuyers: [],
          topUsers: [],
        });
      }
      if (String(url).startsWith("/rewards")) {
        return Promise.resolve({
          user: {
            id: "42",
            name: null,
            full_name: null,
            rank: "Bronze",
            level: 1,
            xpCurrent: 0,
            xpRequired: 100,
            totalCoins: 0,
            referralCode: "REF123",
            dailySecretCode: "SECRET",
            leaderboard: { history: [] },
          },
          referralChain: [{ id: 1, name: null, level: 1, totalCoins: 0 }],
          leaderboard: { history: [] },
        });
      }
      return Promise.resolve({});
    });
  });

  it("renders without crashing and shows fallback initials", async () => {
    render(
      <MemoryRouter>
        <Rewards />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("overview")).toBeInTheDocument();
    });

    const initials = screen.getAllByText(/^U$/);
    expect(initials.length).toBeGreaterThan(0);
  });
});
