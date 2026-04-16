function normalizeQueryArgs(arg, values) {
  if (typeof arg === "string") {
    return { text: arg, values: values || [] };
  }
  if (arg && typeof arg === "object" && typeof arg.text === "string") {
    return { text: arg.text, values: arg.values || [] };
  }
  return { text: String(arg || ""), values: [] };
}

function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

function loadSubscriptionController({
  poolQueryImpl = async () => ({ rows: [], rowCount: 0 }),
  clientQueryImpl = null,
} = {}) {
  jest.resetModules();

  const poolQuery = jest.fn((arg, values) =>
    poolQueryImpl(normalizeQueryArgs(arg, values)),
  );
  const clientQuery = jest.fn((arg, values) => {
    const normalized = normalizeQueryArgs(arg, values);
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized.text)) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return (clientQueryImpl || poolQueryImpl)(normalized);
  });
  const connect = jest.fn(async () => ({
    query: clientQuery,
    release: jest.fn(),
  }));
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const schemaService = {
    ensureSubscriptionSchema: jest.fn(async () => true),
    withSubscriptionLock: jest.fn(async () => {}),
    serializeSubscriptionHistoryRow: jest.fn((row) => ({
      id: row.id,
      planName: row.plan_name,
      startedAt: row.started_at || row.created_at || null,
      expiresAt: row.expires_at || null,
      isActive: Boolean(row.is_active),
      isTrial: Boolean(row.is_trial),
      cancelledAt: row.cancelled_at || null,
      cancelReason: row.cancel_reason || "",
      status: row.cancelled_at ? "cancelled" : row.is_active ? "active" : "expired",
    })),
  };

  jest.doMock("../src/config/db", () => ({
    query: poolQuery,
    connect,
  }));
  jest.doMock("../src/utils/logger", () => logger);
  jest.doMock("../src/services/subscriptionSchemaService", () => schemaService);

  const controller = require("../src/controllers/subscriptionController");
  return {
    controller,
    poolQuery,
    clientQuery,
    connect,
    logger,
    schemaService,
  };
}

describe("subscriptionController regression behavior", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("getHistory uses text-safe user filtering and returns serialized history", async () => {
    const { controller, poolQuery, schemaService } = loadSubscriptionController({
      poolQueryImpl: async ({ text, values }) => {
        if (text.includes("FROM user_subscriptions")) {
          expect(text).toContain("WHERE user_id::text = $1");
          expect(values).toEqual(["42"]);
          return {
            rows: [
              {
                id: 12,
                plan_name: "silver",
                started_at: "2026-03-01T00:00:00.000Z",
                expires_at: "2026-09-01T00:00:00.000Z",
                is_active: true,
                is_trial: false,
                cancelled_at: null,
                cancel_reason: null,
                created_at: "2026-03-01T00:00:00.000Z",
              },
            ],
          };
        }
        throw new Error(`Unexpected query: ${text}`);
      },
    });

    const req = { user: { userId: "42" } };
    const res = createResponseMock();

    await controller.getHistory(req, res);

    expect(schemaService.ensureSubscriptionSchema).toHaveBeenCalled();
    expect(poolQuery).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      history: [
        expect.objectContaining({
          id: 12,
          planName: "silver",
          status: "active",
        }),
      ],
    });
  });

  it("cancelSubscription locks, cancels the matching record, and downgrades the user with text-safe IDs", async () => {
    const { controller, clientQuery, connect, schemaService } = loadSubscriptionController({
      clientQueryImpl: async ({ text, values }) => {
        if (text.includes("FROM user_subscriptions") && text.includes("WHERE id = $1")) {
          expect(text).toContain("user_id::text = $2");
          expect(values).toEqual([55, "42"]);
          return {
            rows: [
              {
                id: 55,
                plan_name: "premium",
                is_active: true,
                is_trial: false,
                started_at: "2026-03-01T00:00:00.000Z",
                expires_at: "2027-03-01T00:00:00.000Z",
                created_at: "2026-03-01T00:00:00.000Z",
              },
            ],
          };
        }
        if (text.includes("UPDATE user_subscriptions") && text.includes("cancelled_at = NOW()")) {
          expect(values).toEqual([55, "User requested cancellation"]);
          return {
            rows: [
              {
                id: 55,
                plan_name: "premium",
                is_active: false,
                is_trial: false,
                cancelled_at: "2026-03-18T00:00:00.000Z",
                cancel_reason: "User requested cancellation",
                started_at: "2026-03-01T00:00:00.000Z",
                expires_at: "2027-03-01T00:00:00.000Z",
                created_at: "2026-03-01T00:00:00.000Z",
              },
            ],
          };
        }
        if (text.includes("UPDATE users")) {
          expect(text).toContain("WHERE user_id::text = $1");
          expect(values).toEqual(["42"]);
          return { rows: [], rowCount: 1 };
        }
        throw new Error(`Unexpected client query: ${text}`);
      },
    });

    const req = {
      user: { id: "42" },
      params: { subscriptionId: "55" },
      body: { reason: "User requested cancellation" },
    };
    const res = createResponseMock();

    await controller.cancelSubscription(req, res);

    expect(connect).toHaveBeenCalled();
    expect(schemaService.ensureSubscriptionSchema).toHaveBeenCalled();
    expect(schemaService.withSubscriptionLock).toHaveBeenCalled();
    expect(clientQuery).toHaveBeenCalledWith("COMMIT");
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        currentPlan: "basic",
        cancelledSubscription: expect.objectContaining({
          id: 55,
          status: "cancelled",
        }),
      }),
    );
  });
});
