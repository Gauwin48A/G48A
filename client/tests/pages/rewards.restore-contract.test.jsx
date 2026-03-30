// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Rewards from "@/pages/Rewards";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const hoisted = vi.hoisted(() => ({
  libGet: vi.fn(),
  libPost: vi.fn(),
  toast: vi.fn(),
  authState: {
    user: { id: "42", role: "user" },
    loading: false,
    refreshAuth: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => options?.defaultValue ?? key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => hoisted.authState,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: hoisted.toast,
  }),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: (...args) => hoisted.libGet(...args),
    post: (...args) => hoisted.libPost(...args),
  },
}));

function createRewardsResponse({
  totalCoins = 120,
  profileComplete = false,
  hasPosted = true,
} = {}) {
  return {
    user: {
      id: "42",
      name: "Casey Seller",
      rank: "Gold",
      level: 3,
      xpCurrent: 60,
      xpRequired: 100,
      totalCoins,
      referralCode: "REF123",
      dailySecretCode: "SECRET",
      leaderboard: { history: [] },
      totalReferrals: 5,
      qualifiedReferrals: 1,
      visitStreak: 4,
      postStreak: 2,
      chainEarnedPoints: 20,
      potentialReferralPoints: 45,
      profileComplete,
      hasPosted,
      activityStats: {
        salesCount: 2,
        referralsCount: 5,
        postsCount: hasPosted ? 2 : 0,
        salesToday: 0,
        purchasesToday: 0,
        referralsToday: 0,
        postsToday: 0,
        visitsToday: 1,
      },
    },
    referralChain: [{ id: 1, name: "Rhea", level: 1, totalCoins: 10 }],
    leaderboard: { history: [] },
  };
}

function installApiMocks({
  rewards = createRewardsResponse(),
  upsell = {
    upsell: {
      headline: "Upgrade to Gold",
      benefits: ["Priority reach", "Premium badge"],
      dynamicPrice: { isFlashSale: false },
    },
  },
} = {}) {
  hoisted.libPost.mockResolvedValue({});
  hoisted.libGet.mockImplementation((url) => {
    const target = String(url);

    if (target.startsWith("/subscriptions/upsell")) {
      return Promise.resolve(upsell);
    }
    if (target.startsWith("/coins/engagement")) {
      return Promise.resolve({
        dailyCheckIn: {
          currentDay: 2,
          hasCheckedInToday: false,
          nextReward: 10,
        },
        spin: { hasSpunToday: false },
        scratch: { available: 1 },
      });
    }
    if (target.startsWith("/rewards/log")) {
      return Promise.resolve([]);
    }
    if (target.startsWith("/public-wall")) {
      return Promise.resolve({
        topSellers: [],
        topBuyers: [],
        topUsers: [],
      });
    }
    if (target.startsWith("/rewards")) {
      return Promise.resolve(rewards);
    }
    if (target.startsWith("/coins/balance")) {
      return Promise.resolve({ balance: rewards.user.totalCoins });
    }
    if (target.startsWith("/coins/history")) {
      return Promise.resolve({ transactions: [] });
    }
    return Promise.resolve({});
  });
}

function renderRewardsPage() {
  return render(
    <MemoryRouter future={routerFuture}>
      <Rewards />
    </MemoryRouter>,
  );
}

async function waitForRewardsPage() {
  await waitFor(() => {
    expect(screen.getByText("Rewards & Referrals")).toBeTruthy();
  });
  return screen.getByRole("navigation", { name: "Rewards sections" });
}

describe("Rewards safe restore contract", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("authToken", "token-123");
    localStorage.setItem("userId", "42");
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.requestAnimationFrame = (callback) => {
      callback();
      return 1;
    };
    window.cancelAnimationFrame = vi.fn();
  });

  it("renders the overview upsell banner and lets it dismiss", async () => {
    installApiMocks();
    renderRewardsPage();

    await waitForRewardsPage();

    expect(await screen.findByText("Upgrade to Gold")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() => {
      expect(screen.queryByText("Upgrade to Gold")).toBeNull();
    });
  });

  it("shows Share post and Complete your profile challenges with real CTAs", async () => {
    installApiMocks({
      rewards: createRewardsResponse({ profileComplete: false, hasPosted: true }),
    });
    renderRewardsPage();

    const nav = await waitForRewardsPage();
    fireEvent.click(within(nav).getByRole("button", { name: "Earn Coins" }));
    fireEvent.click(screen.getByRole("button", { name: "View all challenges" }));

    expect(screen.getAllByText("Share post").length).toBeGreaterThan(0);
    expect(screen.getByText("Complete your profile")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit Profile" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Share post" }).length).toBeGreaterThan(0);
  });

  it("keeps challenge meanings unique and leaves gated legacy items out", async () => {
    installApiMocks();
    renderRewardsPage();

    const nav = await waitForRewardsPage();
    fireEvent.click(within(nav).getByRole("button", { name: "Earn Coins" }));
    fireEvent.click(screen.getByRole("button", { name: "View all challenges" }));

    const challengeSection = document.querySelector("#rewards-challenges");
    expect(challengeSection).toBeTruthy();

    expect(within(challengeSection).getAllByText("Invite a friend")).toHaveLength(1);
    expect(within(challengeSection).queryByText("Daily Login")).toBeNull();
    expect(within(challengeSection).queryByText("Create Listing")).toBeNull();
    expect(within(challengeSection).queryByText("Invite Friend")).toBeNull();
    expect(within(challengeSection).queryByText("Get Review")).toBeNull();
  });

  it("renders the cleaned milestone taxonomy without the old First Sale duplicate", async () => {
    installApiMocks();
    renderRewardsPage();

    const nav = await waitForRewardsPage();
    fireEvent.click(within(nav).getByRole("button", { name: "Level benefits" }));

    expect(await screen.findByText("First Post")).toBeTruthy();
    expect(screen.getByText("Profile Completed")).toBeTruthy();
    expect(screen.getByText("Qualified Referral")).toBeTruthy();
    expect(screen.getByText("Seven Day Streak")).toBeTruthy();
    expect(screen.queryByText("First Sale")).toBeNull();
  });

  it("adds store promo ribbons and clear ready versus keep earning states", async () => {
    installApiMocks({
      rewards: createRewardsResponse({ totalCoins: 120 }),
    });
    renderRewardsPage();

    const nav = await waitForRewardsPage();
    fireEvent.click(within(nav).getByRole("button", { name: "Redeem coins" }));

    expect(await screen.findByText("Popular")).toBeTruthy();
    expect(screen.getByText("Best Value")).toBeTruthy();
    expect(screen.getByText("Limited")).toBeTruthy();
    expect(screen.getAllByText("Ready to redeem").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Keep earning").length).toBeGreaterThan(0);
  });

  it("keeps the referrals section stable after the restore work", async () => {
    installApiMocks();
    renderRewardsPage();

    const nav = await waitForRewardsPage();
    fireEvent.click(within(nav).getByRole("button", { name: "Referrals" }));

    expect(await screen.findByText("Your referral link")).toBeTruthy();
    expect(screen.getByText(/^Direct referrals/i)).toBeTruthy();
    expect(screen.getByText(/^Indirect referrals/i)).toBeTruthy();
  });
});
