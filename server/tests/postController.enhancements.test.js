const request = require("supertest");
const express = require("express");

describe("Post Controller & Seller Listing Enhancements (Batch 3)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("PATCH /api/posts/:postId & PUT /api/posts/:postId Route Logic", () => {
    function createTestApp(queryMock) {
      jest.resetModules();

      const query = jest.fn(async (config) => queryMock(config));
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      jest.doMock("../src/config/db", () => ({ query }));
      jest.doMock("../src/utils/logger", () => logger);
      jest.doMock("../src/middleware/auth", () => ({
        protect: (req, res, next) => {
          req.user = { userId: req.headers["x-test-user-id"] || "seller_100" };
          next();
        },
        optionalAuth: (req, res, next) => next(),
        requirePlanAndKyc: (req, res, next) => next(),
      }));
      jest.doMock("../src/middleware/upload", () => ({
        fields: () => (req, res, next) => next(),
        postUploadSecurity: (req, res, next) => next(),
      }));

      const app = express();
      app.use(express.json());
      const postsRoutes = require("../src/routes/posts");
      app.use("/api/posts", postsRoutes);

      return { app, query, logger };
    }

    it("PATCH /api/posts/:postId updates title, price, condition, and image URLs via JSON", async () => {
      let updatedPost = false;

      const { app } = createTestApp(async ({ text, values }) => {
        const sql = String(text || "");

        if (sql.includes("SELECT user_id, created_at, status, images FROM posts")) {
          expect(values).toEqual(["post_999"]);
          return {
            rows: [
              {
                user_id: "seller_100",
                created_at: new Date(),
                status: "active",
                images: ["https://example.com/old1.jpg"],
              },
            ],
          };
        }

        if (sql.includes("UPDATE posts SET")) {
          updatedPost = true;
          return {
            rows: [
              {
                post_id: "post_999",
                user_id: "seller_100",
                title: "MacBook Pro 16 M3 Max",
                price: 249000,
                condition: "like_new",
                is_negotiable: true,
                images: ["https://example.com/new1.jpg", "https://example.com/new2.jpg"],
                status: "active",
              },
            ],
          };
        }

        throw new Error(`Unexpected query in patch test: ${sql}`);
      });

      const res = await request(app)
        .patch("/api/posts/post_999")
        .set("x-test-user-id", "seller_100")
        .send({
          title: "MacBook Pro 16 M3 Max",
          price: 249000,
          condition: "Like New",
          is_negotiable: true,
          images: ["https://example.com/new1.jpg", "https://example.com/new2.jpg"],
        });

      expect(res.status).toBe(200);
      expect(updatedPost).toBe(true);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: "Post updated successfully",
          post: expect.objectContaining({
            post_id: "post_999",
            title: "MacBook Pro 16 M3 Max",
          }),
        })
      );
    });

    it("PATCH /api/posts/:postId rejects unauthorized edit by non-owner with 403 Forbidden", async () => {
      const { app } = createTestApp(async ({ text }) => {
        const sql = String(text || "");
        if (sql.includes("SELECT user_id, created_at, status, images FROM posts")) {
          return {
            rows: [
              {
                user_id: "original_owner_555",
                created_at: new Date(),
                status: "active",
              },
            ],
          };
        }
        throw new Error(`Unexpected query in forbidden test: ${sql}`);
      });

      const res = await request(app)
        .patch("/api/posts/post_999")
        .set("x-test-user-id", "attacker_888")
        .send({ title: "Hacked Title" });

      expect(res.status).toBe(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          error: "Not authorized to edit this post",
        })
      );
    });

    it("PATCH /api/posts/:postId blocks edits on sold listings with 409 Conflict", async () => {
      const { app } = createTestApp(async ({ text }) => {
        const sql = String(text || "");
        if (sql.includes("SELECT user_id, created_at, status, images FROM posts")) {
          return {
            rows: [
              {
                user_id: "seller_100",
                created_at: new Date(),
                status: "sold", // Listing already completed
              },
            ],
          };
        }
        throw new Error(`Unexpected query in sold test: ${sql}`);
      });

      const res = await request(app)
        .patch("/api/posts/post_999")
        .set("x-test-user-id", "seller_100")
        .send({ price: 1000 });

      expect(res.status).toBe(409);
      expect(res.body).toEqual(
        expect.objectContaining({
          error: "Cannot edit a post that has already been sold",
        })
      );
    });
  });

  describe("Post Expiry Worker (cronPostExpiry)", () => {
    it("scans expired posts using post_id, updates status to expired, and emits alert", async () => {
      jest.resetModules();

      let markedExpiredPostId = null;
      let emittedNotification = null;

      const mockClient = {
        query: jest.fn(async (text, values) => {
          const sql = String(text?.text || text || "");

          if (sql.includes("SELECT p.post_id, p.title, p.user_id, p.created_at, p.expires_at")) {
            return {
              rows: [
                {
                  post_id: 1234,
                  title: "Vintage Rolex Submariner",
                  user_id: 50,
                  created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
                  expires_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                },
              ],
            };
          }

          if (sql.includes("BEGIN") || sql.includes("COMMIT")) {
            return { rows: [] };
          }

          if (sql.includes("UPDATE posts SET status = 'expired'") && sql.includes("WHERE post_id = $1")) {
            markedExpiredPostId = values[0];
            return { rowCount: 1 };
          }

          throw new Error(`Unexpected query in cron test: ${sql}`);
        }),
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn(async () => mockClient),
        query: mockClient.query,
      };

      const mockEmitNotification = jest.fn(async (userId, payload) => {
        emittedNotification = { userId, payload };
      });

      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      jest.doMock("../src/config/db", () => mockPool);
      jest.doMock("../src/services/notificationEmitter", () => ({ emitNotification: mockEmitNotification }));
      jest.doMock("../src/utils/logger", () => mockLogger);

      const { processExpiredPosts } = require("../src/workers/cronPostExpiry");
      const result = await processExpiredPosts();

      expect(result).toEqual({ expiredCount: 1 });
      expect(markedExpiredPostId).toBe(1234);
      expect(emittedNotification).not.toBeNull();
      expect(emittedNotification.userId).toBe(50);
      expect(emittedNotification.payload.data.route).toBe("zaruda://expiry-action/1234");
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
