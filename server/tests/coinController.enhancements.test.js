const coinController = require("../src/controllers/coinController");

describe("coinController Enhancements", () => {
  describe("SPIN_REWARD_POOL & Config", () => {
    test("rewards config returns non-negative spin reward pool", async () => {
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await coinController.getRewardsConfig(req, res);

      expect(res.json).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(Array.isArray(payload.spinRewardPool)).toBe(true);

      const hasNegativeRewards = payload.spinRewardPool.some((s) => s.amount < 0);
      expect(hasNegativeRewards).toBe(false);

      const types = payload.storeItems.map((item) => item.type);
      expect(types).toContain("boost");
      expect(types).toContain("featured");
      expect(types).toContain("spotlight");
      expect(types).toContain("badge");
    });

    test("milestones in rewards config contains progressive tiers", async () => {
      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await coinController.getRewardsConfig(req, res);

      const payload = res.json.mock.calls[0][0];
      expect(Array.isArray(payload.milestones)).toBe(true);
      expect(payload.milestones.length).toBeGreaterThanOrEqual(3);
      expect(payload.milestones[0].count).toBe(3);
      expect(payload.milestones[0].reward).toBe(50);
    });
  });

  describe("Store Redeem Catalog", () => {
    test("rejects unknown reward types cleanly with 400", async () => {
      const req = {
        user: { userId: "test-user-id" },
        body: { type: "non_existent_item" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await coinController.redeemStoreReward(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid reward type" }),
      );
    });

    test("requires postId for post boost products", async () => {
      const req = {
        user: { userId: "test-user-id" },
        body: { type: "boost", postId: "" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await coinController.redeemStoreReward(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "postId is required for this reward" }),
      );
    });
  });

  describe("Daily Secret Code", () => {
    test("rejects empty secret code with 400", async () => {
      const req = {
        user: { userId: "test-user-id" },
        body: { code: "" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await coinController.claimDailySecretCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Secret code is required" }),
      );
    });
  });
});
