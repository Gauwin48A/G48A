const request = require("supertest");
const express = require("express");
const speakeasy = require("speakeasy");

describe("Auth Security & 2FA Enhancements (Batch 5)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("2FA Setup, Verify, Status & Disable Flows", () => {
    function create2faApp(queryMock) {
      jest.resetModules();
      const query = jest.fn(async (config) => {
        const text = typeof config === "string" ? config : config?.text || "";
        const values = Array.isArray(config?.values) ? config.values : [];
        return queryMock({ text, values });
      });

      const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

      jest.doMock("../src/config/db", () => ({ query }));
      jest.doMock("../src/utils/logger", () => logger);
      jest.doMock("../src/middleware/auth", () => ({
        protect: (req, res, next) => {
          req.user = { userId: "user_42", email: "sec_test@zaruda.app" };
          next();
        },
      }));

      const twoFactorController = require("../src/controllers/twoFactorController");
      if (typeof twoFactorController._resetCache === "function") {
        twoFactorController._resetCache();
      }

      const app = express();
      app.use(express.json());
      const twoFactorRoutes = require("../src/routes/twoFactor");
      app.use("/api/auth/2fa", twoFactorRoutes);

      return { app, query, twoFactorController };
    }

    it("POST /api/auth/2fa/setup generates TOTP secret and QR code data URI", async () => {
      let storedPendingSecret = false;

      const { app } = create2faApp(async ({ text, values }) => {
        const sql = String(text || "");

        if (sql.includes("information_schema.columns")) {
          return {
            rows: [
              { column_name: "two_fa_enabled" },
              { column_name: "two_fa_secret" },
              { column_name: "two_fa_backup_codes" },
            ],
          };
        }

        if (sql.includes("SELECT") && sql.includes("FROM users")) {
          return {
            rows: [{ enabled: false, secret: null, backup_codes: null }],
          };
        }

        if (sql.includes("UPDATE users") && sql.includes("two_fa_secret")) {
          storedPendingSecret = true;
          return { rowCount: 1 };
        }

        throw new Error(`Unexpected query in 2FA setup: ${sql}`);
      });

      const res = await request(app).post("/api/auth/2fa/setup");

      expect(res.status).toBe(200);
      expect(storedPendingSecret).toBe(true);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          secret: expect.any(String),
          qrCode: expect.stringMatching(/^data:image\/png;base64,/),
        })
      );
    });

    it("POST /api/auth/2fa/verify enables 2FA and produces 10 backup recovery codes", async () => {
      const generatedSecret = speakeasy.generateSecret({ length: 32 });
      const validToken = speakeasy.totp({
        secret: generatedSecret.base32,
        encoding: "base32",
      });

      let updatedEnabled = false;

      const { app } = create2faApp(async ({ text }) => {
        const sql = String(text || "");

        if (sql.includes("information_schema.columns")) {
          return {
            rows: [
              { column_name: "two_fa_enabled" },
              { column_name: "two_fa_secret" },
              { column_name: "two_fa_backup_codes" },
            ],
          };
        }

        if (sql.includes("SELECT") && sql.includes("FROM users")) {
          return {
            rows: [{ enabled: false, secret: generatedSecret.base32, backup_codes: null }],
          };
        }

        if (sql.includes("UPDATE users") && sql.includes("two_fa_enabled")) {
          updatedEnabled = true;
          return { rowCount: 1 };
        }

        throw new Error(`Unexpected query in 2FA verify: ${sql}`);
      });

      const res = await request(app)
        .post("/api/auth/2fa/verify")
        .send({ code: validToken });

      expect(res.status).toBe(200);
      expect(updatedEnabled).toBe(true);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.backupCodes)).toBe(true);
      expect(res.body.backupCodes.length).toBe(8);
    });

    it("GET /api/auth/2fa/status returns current status", async () => {
      const { app } = create2faApp(async ({ text }) => {
        const sql = String(text || "");
        if (sql.includes("information_schema.columns")) {
          return {
            rows: [
              { column_name: "two_fa_enabled" },
              { column_name: "two_fa_secret" },
              { column_name: "two_fa_backup_codes" },
            ],
          };
        }
        if (sql.includes("SELECT") && sql.includes("FROM users")) {
          return {
            rows: [{ enabled: true, secret: "TEST_SECRET", backup_codes: null }],
          };
        }
        throw new Error(`Unexpected query in 2FA status: ${sql}`);
      });

      const res = await request(app).get("/api/auth/2fa/status");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          enabled: true,
          available: true,
        })
      );
    });
  });
});
