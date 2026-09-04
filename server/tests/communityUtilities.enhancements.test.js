const request = require("supertest");
const express = require("express");

describe("Community Channels & Utilities Enhancements (Batches 6 & 7)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Community Channels API", () => {
    function createChannelApp(queryMock) {
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
          req.user = { userId: "99", email: "creator@zaruda.app" };
          next();
        },
        optionalAuth: (req, res, next) => {
          req.user = { userId: "99" };
          next();
        },
      }));
      jest.doMock("../src/middleware/upload", () => ({
        fields: () => (req, res, next) => next(),
        getImageUrl: () => "https://example.com/uploaded.jpg",
      }));

      const app = express();
      app.use(express.json());
      const channelsRoutes = require("../src/routes/channels");
      app.use("/api/channels", channelsRoutes);

      return { app, query };
    }

    it("GET /api/channels lists active community channels", async () => {
      const { app } = createChannelApp(async ({ text }) => {
        const sql = String(text || "");
        if (sql.includes("SELECT") && sql.includes("FROM channels")) {
          return {
            rows: [
              {
                channel_id: 1,
                name: "Bangalore Tech Hub",
                description: "Electronics deals & tech discussions in Bengaluru.",
                followers_count: 1420,
                posts_count: 85,
                is_verified: true,
              },
            ],
          };
        }
        return { rows: [] };
      });

      const res = await request(app).get("/api/channels");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          channel_id: 1,
          name: "Bangalore Tech Hub",
        })
      );
    });

    it("POST /api/channels/:id/posts creates a new channel post for premium channel owner", async () => {
      let createdPost = false;

      const { app } = createChannelApp(async ({ text }) => {
        const sql = String(text || "");

        if (sql.includes("information_schema.columns")) {
          return { rows: [] };
        }
        if (sql.includes("FROM users")) {
          return { rows: [{ user_id: "99", tier: "premium" }] };
        }
        if (sql.includes("FROM channels")) {
          return { rows: [{ channel_id: 1, owner_id: 99 }] };
        }
        if (sql.includes("INSERT INTO channel_posts") || sql.includes("channel_posts")) {
          createdPost = true;
          return {
            rows: [
              {
                post_id: 501,
                channel_id: 1,
                user_id: 99,
                description: "Special discount on M3 MacBooks this weekend!",
                likes_count: 0,
                created_at: new Date(),
              },
            ],
          };
        }

        return { rows: [{ user_id: "99", tier_name: "premium", channel_id: 1 }] };
      });

      const res = await request(app)
        .post("/api/channels/1/posts")
        .send({ description: "Special discount on M3 MacBooks this weekend!" });

      expect(res.status).toBe(200);
      expect(createdPost).toBe(true);
    });
  });
});
