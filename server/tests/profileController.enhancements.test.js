/**
 * profileController.enhancements.test.js
 * ──────────────────────────────────────
 * Backend unit tests for the Profile & Identity ecosystem improvements.
 * Covers: GET /api/profile/full, avatar parameter normalization, UPI ID regex,
 * IFSC structure, IDOR protection, and empty profile handling.
 */

function loadProfileControllerWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(async (queryConfig) => queryImpl(queryConfig));
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const cacheService = {
    getOrSetWithStampedeProtection: jest.fn(async (_key, producer) => producer()),
    del: jest.fn(),
    clearPattern: jest.fn(),
  };

  jest.doMock("../src/config/db", () => ({ query }));
  jest.doMock("../src/utils/logger", () => logger);
  jest.doMock("../src/services/cacheService", () => cacheService);
  jest.doMock("../src/services/rewardsLedgerService", () => ({ applyRewardDelta: jest.fn() }));
  jest.doMock("../src/services/trustBadgeService", () => ({
    getTrustSnapshot: jest.fn(async () => ({ score: 0, label: "", level: "bronze" })),
  }));
  // Mock razorpayService so require() inside linkPayoutAccount doesn't crash
  jest.doMock("../src/services/razorpayService", () => ({
    ensureContact: jest.fn(async () => ({ success: true, contactId: "cont_test" })),
    createFundAccount: jest.fn(async () => ({ success: true, fundAccountId: "fa_test" })),
  }));

  const controller = require("../src/controllers/profileController");
  return { controller, query, logger, cacheService };
}

function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe("profileController enhancements", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Test 1: GET /api/profile/full returns complete unified schema ────────────
  it("getFullProfile returns complete unified schema with stats and badges", async () => {
    const { controller } = loadProfileControllerWithQueryMock(
      async ({ text, values }) => {
        const sql = String(text || "");

        if (sql.includes("FROM users u") && sql.includes("LEFT JOIN profiles p")) {
          return {
            rows: [
              {
                user_id: "usr_001",
                name: "Full Profile User",
                email: "fp@example.com",
                phone_number: "+919876543210",
                role: "seller",
                created_at: "2025-01-15T00:00:00.000Z",
                tier: "gold",
                current_plan: "premium",
                full_name: "Full Profile User",
                phone: "9876543210",
                address: "Hyderabad",
                avatar_url: "https://cdn.example/avatar.webp",
                bio: "Top seller",
                cover_image_url: "https://cdn.example/cover.webp",
                social_links: { twitter: "fpuser" },
                reward_badge: "elite",
                payout_upi_id: "fp@okaxis",
                payout_bank_details: null,
                verified: true,
                updated_at: "2026-03-10T00:00:00.000Z",
                rewards_rank: "Gold",
              },
            ],
          };
        }

        if (sql.includes("SELECT coins FROM users")) {
          return { rows: [{ coins: 450 }] };
        }

        if (sql.includes("COUNT(*) FILTER") && sql.includes("posts")) {
          return { rows: [{ active_listings: "12", sold_listings: "34", total_sales: "540000" }] };
        }

        if (sql.includes("follows") || sql.includes("followers")) {
          return { rows: [{ followers: "185", following: "24" }] };
        }

        if (sql.includes("email_verified") && sql.includes("phone_verified")) {
          return { rows: [{ email_verified: true, phone_verified: true, kyc_verified: true }] };
        }

        throw new Error(`Unexpected query in getFullProfile test: ${sql}`);
      }
    );

    const req = { user: { userId: "usr_001" }, query: {} };
    const res = createResponseMock();

    await controller.getFullProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        user: expect.objectContaining({
          userId: "usr_001",
          name: "Full Profile User",
          role: "seller",
          currentPlan: "premium",
          coins: 450,
          rewardBadge: "elite",
        }),
        profile: expect.objectContaining({
          avatarUrl: "https://cdn.example/avatar.webp",
          coverImageUrl: "https://cdn.example/cover.webp",
          bio: "Top seller",
        }),
        verification: expect.objectContaining({
          emailVerified: true,
          phoneVerified: true,
          aadhaarVerified: true,
        }),
        stats: expect.objectContaining({
          activeListings: 12,
          soldListings: 34,
        }),
      })
    );
  });

  // ── Test 2: updateProfile accepts both avatar and avatar_url ─────────────────
  it("updateProfile accepts both avatar and avatar_url parameters", async () => {
    const { controller } = loadProfileControllerWithQueryMock(
      async ({ text, values }) => {
        const sql = String(text || "");

        if (sql.includes("table_name = 'profiles'") && sql.includes("column_name = 'updated_at'")) {
          return { rows: [{ available: true }] };
        }

        if (sql.includes("INSERT INTO profiles") && sql.includes("ON CONFLICT")) {
          expect(values[4]).toBe("https://cdn.example/new-avatar.webp");
          return {
            rows: [
              {
                profile_id: 5,
                user_id: "usr_002",
                full_name: "Avatar Test",
                phone: "9876543210",
                address: null,
                avatar_url: "https://cdn.example/new-avatar.webp",
                bio: null,
                verified: false,
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-03-10T00:00:00.000Z",
              },
            ],
          };
        }

        if (sql.includes("UPDATE users") && sql.includes("name =")) {
          return { rows: [] };
        }

        throw new Error(`Unexpected query in avatar test: ${sql}`);
      }
    );

    const req = {
      user: { userId: "usr_002" },
      body: {
        avatar: "https://cdn.example/new-avatar.webp",
        full_name: "Avatar Test",
        phone: "9876543210",
      },
    };
    const res = createResponseMock();

    await controller.updateProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "usr_002",
        avatar_url: "https://cdn.example/new-avatar.webp",
      })
    );
  });

  // ── Test 3: updateProfile validates UPI ID format ────────────────────────────
  it("updateProfile rejects invalid UPI ID format with 400", async () => {
    const { controller } = loadProfileControllerWithQueryMock(
      async ({ text }) => {
        const sql = String(text || "");
        if (sql.includes("table_name = 'profiles'") && sql.includes("column_name = 'updated_at'")) {
          return { rows: [{ available: true }] };
        }
        throw new Error(`Unexpected query in UPI validation test: ${sql}`);
      }
    );

    const req = {
      user: { userId: "usr_003" },
      body: {
        full_name: "UPI Test",
        payout_upi_id: "invalid-upi-no-at-sign",
      },
    };
    const res = createResponseMock();

    await controller.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("UPI"),
      })
    );
  });

  // ── Test 4: linkPayoutAccount validates UPI ID regex ─────────────────────────
  it("linkPayoutAccount accepts valid UPI ID format", async () => {
    const razorpayMock = {
      ensureContact: jest.fn(async () => ({ success: true, contactId: "cont_004" })),
      createFundAccount: jest.fn(async () => ({ success: true, fundAccountId: "fa_004" })),
    };
    jest.doMock("../src/services/razorpayService", () => razorpayMock);

    const { controller } = loadProfileControllerWithQueryMock(
      async ({ text }) => {
        const sql = String(text || "");
        if (sql.includes("payout_upi_id FROM") || sql.includes("SELECT payout_upi_id")) {
          return { rows: [{ payout_upi_id: null, payout_bank_details: null }] };
        }
        if (sql.includes("UPDATE profiles") && sql.includes("payout_upi_id")) {
          return { rows: [] };
        }
        if (sql.includes("UPDATE profiles") || sql.includes("INSERT INTO profiles")) {
          return { rows: [] };
        }
        throw new Error(`Unexpected query in UPI link test: ${sql}`);
      }
    );

    const req = {
      user: { userId: "usr_004" },
      body: { type: "upi", upi_id: "seller@okaxis" },
    };
    const res = createResponseMock();

    await controller.linkPayoutAccount(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  // ── Test 5: linkPayoutAccount validates IFSC structure ───────────────────────
  it("linkPayoutAccount rejects invalid IFSC with 400", async () => {
    const razorpayMock = {
      ensureContact: jest.fn(async () => ({ success: true, contactId: "cont_005" })),
      createFundAccount: jest.fn(async () => ({ success: true, fundAccountId: "fa_005" })),
    };
    jest.doMock("../src/services/razorpayService", () => razorpayMock);

    const { controller } = loadProfileControllerWithQueryMock(
      async ({ text }) => {
        const sql = String(text || "");
        if (sql.includes("payout_upi_id FROM") || sql.includes("SELECT payout_upi_id")) {
          return { rows: [{ payout_upi_id: null, payout_bank_details: null }] };
        }
        throw new Error(`Unexpected query in IFSC test: ${sql}`);
      }
    );

    const req = {
      user: { userId: "usr_005" },
      body: {
        type: "bank_account",
        bank_account: {
          account_number: "1234567890",
          ifsc: "INVALID",
          beneficiary_name: "Test User",
        },
      },
    };
    const res = createResponseMock();

    await controller.linkPayoutAccount(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("IFSC"),
      })
    );
  });

  // ── Test 6: IDOR protection — reject updating another user's profile ────────
  it("rejects IDOR attempt to update another user's profile with 403", async () => {
    const { controller } = loadProfileControllerWithQueryMock(async () => {
      throw new Error("Should not reach database — IDOR check should fail first");
    });

    const req = {
      user: { userId: "attacker_123" },
      body: {
        userId: "victim_456",
        full_name: "Hacked Name",
      },
    };
    const res = createResponseMock();

    await controller.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/cannot access|FORBIDDEN/),
      })
    );
  });

  // ── Test 7: GET /api/profile/full returns default profile gracefully ────────
  it("getFullProfile returns default profile when user has no profile row", async () => {
    const { controller } = loadProfileControllerWithQueryMock(
      async ({ text }) => {
        const sql = String(text || "");

        if (sql.includes("FROM users u") && sql.includes("LEFT JOIN profiles p")) {
          return {
            rows: [
              {
                user_id: "usr_new",
                name: "New User",
                email: "new@example.com",
                phone_number: null,
                role: "member",
                created_at: "2026-09-01T00:00:00.000Z",
                tier: null,
                current_plan: null,
                full_name: null,
                phone: null,
                address: null,
                avatar_url: null,
                bio: null,
                cover_image_url: null,
                social_links: null,
                reward_badge: null,
                payout_upi_id: null,
                payout_bank_details: null,
                verified: false,
                updated_at: null,
                rewards_rank: "Bronze",
              },
            ],
          };
        }

        if (sql.includes("SELECT coins")) {
          return { rows: [{ coins: 0 }] };
        }

        if (sql.includes("COUNT(*) FILTER")) {
          return { rows: [{ active_listings: "0", sold_listings: "0", total_sales: "0" }] };
        }

        if (sql.includes("follows") || sql.includes("followers")) {
          return { rows: [{ followers: "0", following: "0" }] };
        }

        if (sql.includes("email_verified")) {
          return { rows: [{ email_verified: false, phone_verified: false, kyc_verified: false }] };
        }

        throw new Error(`Unexpected query in empty profile test: ${sql}`);
      }
    );

    const req = { user: { userId: "usr_new" }, query: {} };
    const res = createResponseMock();

    await controller.getFullProfile(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        user: expect.objectContaining({
          userId: "usr_new",
          name: "New User",
          coins: 0,
        }),
        completion: expect.objectContaining({
          percentage: expect.any(Number),
        }),
      })
    );
  });
});
