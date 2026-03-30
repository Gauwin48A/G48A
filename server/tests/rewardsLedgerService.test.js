function normalizeQueryArgs(arg, values) {
  if (typeof arg === "string") {
    return { text: arg, values: values || [] };
  }
  if (arg && typeof arg === "object" && typeof arg.text === "string") {
    return { text: arg.text, values: arg.values || [] };
  }
  return { text: String(arg || ""), values: [] };
}

function loadRewardsLedgerService({ clientQueryImpl } = {}) {
  jest.resetModules();

  const poolQuery = jest.fn(async (arg, values) => {
    const normalized = normalizeQueryArgs(arg, values);
    if (
      normalized.text.includes("CREATE TABLE IF NOT EXISTS reward_log") ||
      normalized.text.includes("CREATE INDEX IF NOT EXISTS idx_reward_log_user_created")
    ) {
      return { rows: [], rowCount: 0 };
    }
    if (
      normalized.text.includes("CREATE TABLE IF NOT EXISTS reward_idempotency") ||
      normalized.text.includes("CREATE INDEX IF NOT EXISTS")
    ) {
      return { rows: [], rowCount: 0 };
    }
    throw new Error(`Unexpected pool query: ${normalized.text}`);
  });
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };
  const cacheService = {
    invalidateRelated: jest.fn(),
  };

  jest.doMock("../src/config/db", () => ({ query: poolQuery }));
  jest.doMock("../src/utils/logger", () => logger);
  jest.doMock("../src/services/cacheService", () => cacheService);
  jest.doMock("../src/services/rewardsRealtimeService", () => ({
    publishRewardUpdate: jest.fn(),
  }));

  const service = require("../src/services/rewardsLedgerService");
  const client = {
    query: jest.fn(async (arg, values) => {
      const normalized = normalizeQueryArgs(arg, values);
      if (clientQueryImpl) {
        return clientQueryImpl(normalized);
      }
      if (
        normalized.text.includes("SELECT points") &&
        normalized.text.includes("FOR UPDATE")
      ) {
        return { rows: [{ points: 450 }] };
      }
      return { rows: [], rowCount: 1 };
    }),
  };

  return {
    ...service,
    poolQuery,
    client,
  };
}

describe("rewardsLedgerService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("ensures reward_log exists before applying a positive reward delta", async () => {
    const { applyRewardDeltaInTransaction, poolQuery, client } =
      loadRewardsLedgerService({
        clientQueryImpl: async (normalized) => {
          if (
            normalized.text.includes("SELECT points") &&
            normalized.text.includes("FOR UPDATE")
          ) {
            return { rows: [{ points: 450 }] };
          }
          return { rows: [], rowCount: 1 };
        },
      });

    const result = await applyRewardDeltaInTransaction({
      client,
      userId: "user-1",
      pointsDelta: 100,
      action: "sale_completed",
      description: "Sale reward",
    });

    expect(result).toEqual(
      expect.objectContaining({
        applied: true,
        duplicate: false,
        pointsBefore: 450,
        pointsAfter: 550,
        tier: "Silver",
      }),
    );

    expect(
      poolQuery.mock.calls.some((call) =>
        normalizeQueryArgs(call[0], call[1]).text.includes(
          "CREATE TABLE IF NOT EXISTS reward_log",
        ),
      ),
    ).toBe(true);
    expect(
      client.query.mock.calls.some((call) =>
        normalizeQueryArgs(call[0], call[1]).text.includes("INSERT INTO reward_log"),
      ),
    ).toBe(true);
  });

  it("rejects negative delta when balance would become negative", async () => {
    const { applyRewardDeltaInTransaction, InsufficientPointsError, client } =
      loadRewardsLedgerService({
        clientQueryImpl: async (normalized) => {
          if (
            normalized.text.includes("SELECT points") &&
            normalized.text.includes("FOR UPDATE")
          ) {
            return { rows: [{ points: 25 }] };
          }
          return { rows: [], rowCount: 1 };
        },
      });

    await expect(
      applyRewardDeltaInTransaction({
        client,
        userId: "user-1",
        pointsDelta: -50,
        action: "redemption",
        description: "Redeem points",
      }),
    ).rejects.toBeInstanceOf(InsufficientPointsError);
  });
});
