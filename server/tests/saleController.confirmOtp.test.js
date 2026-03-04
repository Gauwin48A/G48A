const crypto = require("crypto");

jest.mock("../src/config/db", () => ({
  connect: jest.fn(),
  query: jest.fn(),
}));

jest.mock("../src/services/cacheService", () => ({
  clearPattern: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

jest.mock("../src/services/otpService", () => ({
  OTP_EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
  generateOTP: jest.fn(() => "123456"),
  sendOTP: jest.fn(async () => {}),
}));

jest.mock("../src/services/rewardsLedgerService", () => ({
  applyRewardDeltaInTransaction: jest.fn(async () => ({ applied: false })),
  afterCommitRewardMutation: jest.fn(),
}));

jest.mock("../src/utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const pool = require("../src/config/db");
const saleController = require("../src/controllers/saleController");

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function createSchemaColumns() {
  return [
    "transaction_id",
    "post_id",
    "seller_id",
    "buyer_id",
    "status",
    "agreed_price",
    "otp_hash",
    "otp_attempts",
    "otp_expires_at",
    "expires_at",
    "completed_at",
  ].map((column_name) => ({ column_name }));
}

describe("saleController.confirmSale OTP checks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [] });
  });

  it("rejects invalid OTP and increments attempt count", async () => {
    const validOtp = "123456";
    const client = {
      query: jest.fn(async (queryText, values) => {
        const sql = String(queryText || "");

        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (sql.includes("information_schema.columns")) {
          return { rows: createSchemaColumns() };
        }

        if (sql.includes("FROM transactions") && sql.includes("FOR UPDATE")) {
          return {
            rows: [
              {
                transaction_id: "tx-otp-1",
                post_id: "126",
                seller_id: "seller-1",
                buyer_id: "buyer-1",
                agreed_price: 500,
                status: "pending_buyer_confirm",
                otp_hash: hashOtp(validOtp),
                otp_attempts: 0,
                otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              },
            ],
          };
        }

        if (sql.includes("UPDATE transactions") && sql.includes("otp_attempts")) {
          return { rows: [{ otp_attempts: 1 }] };
        }

        throw new Error(`Unexpected query in invalid OTP test: ${sql}`);
      }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);

    const req = {
      user: { userId: "buyer-1" },
      body: { transactionId: "tx-otp-1", otp: "000000" },
    };
    const res = createRes();

    await saleController.confirmSale(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Invalid OTP code"),
      }),
    );
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE transactions"),
      ["tx-otp-1"],
    );
  });

  it("accepts correct OTP and marks transaction completed", async () => {
    const validOtp = "123456";
    const client = {
      query: jest.fn(async (queryText) => {
        const sql = String(queryText || "");

        if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
          return { rows: [] };
        }

        if (sql.includes("information_schema.columns")) {
          return { rows: createSchemaColumns() };
        }

        if (sql.includes("FROM transactions") && sql.includes("FOR UPDATE")) {
          return {
            rows: [
              {
                transaction_id: "tx-otp-2",
                post_id: "127",
                seller_id: "seller-1",
                buyer_id: "buyer-1",
                agreed_price: 1500,
                status: "pending_buyer_confirm",
                otp_hash: hashOtp(validOtp),
                otp_attempts: 0,
                otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              },
            ],
          };
        }

        if (sql.includes("UPDATE transactions SET status = $2")) {
          return { rows: [] };
        }

        if (sql.includes("UPDATE posts SET status = $2")) {
          return { rows: [] };
        }

        throw new Error(`Unexpected query in valid OTP test: ${sql}`);
      }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);

    const req = {
      user: { userId: "buyer-1" },
      body: { transactionId: "tx-otp-2", otp: validOtp },
    };
    const res = createRes();

    await saleController.confirmSale(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Sale confirmed successfully!",
        transaction: expect.objectContaining({
          transactionId: "tx-otp-2",
          status: "completed",
        }),
      }),
    );
  });
});
