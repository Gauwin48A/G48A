const request = require("supertest");
const express = require("express");

describe("Search & Buyer Discovery Enhancements (Batch 4)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/posts/:postId Open Buyer Discovery", () => {
    function createPostApp(queryMock) {
      jest.resetModules();
      const query = jest.fn(async (config) => queryMock(config));
      const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
      const attachTrustToPosts = jest.fn(async (posts) => posts);

      jest.doMock("../src/config/db", () => ({ query }));
      jest.doMock("../src/utils/logger", () => logger);
      jest.doMock("../src/services/trustBadgeService", () => ({ attachTrustToPosts }));
      jest.doMock("../src/middleware/auth", () => ({
        protect: (req, res, next) => next(),
        optionalAuth: (req, res, next) => next(),
        requirePlanAndKyc: (req, res, next) => next(),
      }));

      const app = express();
      app.use(express.json());
      const postsController = require("../src/controllers/postController");
      app.get("/api/posts/:postId", postsController.getPostById);
      app.get("/api/posts", postsController.getAllPosts);

      return { app, query };
    }

    it("GET /api/posts/:postId allows numeric post IDs and unauthenticated guests without KYC/plan block", async () => {
      let postQueryRun = false;

      const { app } = createPostApp(async ({ text, values }) => {
        const sql = String(text || "");

        if (sql.includes("WITH updated_post AS") && sql.includes("WHERE post_id::text = $1")) {
          expect(values).toEqual(["1055"]);
          postQueryRun = true;
          return {
            rows: [
              {
                post_id: 1055,
                title: "Sony PlayStation 5 Disc Edition",
                description: "Mint condition with 2 controllers and God of War Ragnarok.",
                price: "42000",
                location: "Bengaluru, Karnataka",
                status: "active",
                category_name: "Electronics",
                user_id: 77,
                username: "gamer_pro",
                views_count: 14,
                images: ["https://example.com/ps5.jpg"],
              },
            ],
          };
        }

        throw new Error(`Unexpected query in getPostById test: ${sql}`);
      });

      const res = await request(app).get("/api/posts/1055");

      expect(res.status).toBe(200);
      expect(postQueryRun).toBe(true);
      expect(res.body).toEqual(
        expect.objectContaining({
          post: expect.objectContaining({
            post_id: 1055,
            title: "Sony PlayStation 5 Disc Edition",
            is_escrow_eligible: true,
            escrow_fee_pct: 2.5,
          }),
        })
      );
    });

    it("GET /api/posts returns public marketplace feed without 5-item restriction clamp", async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => ({
        post_id: i + 1,
        title: `Item ${i + 1}`,
        price: "1000",
        status: "active",
        created_at: new Date(),
      }));

      const { app } = createPostApp(async ({ text }) => {
        const sql = String(text || "");
        if (sql.includes("FROM posts p")) {
          return {
            rows: mockPosts.map((p) => ({ ...p, total_count: "20" })),
          };
        }
        throw new Error(`Unexpected query in getAllPosts test: ${sql}`);
      });

      const res = await request(app).get("/api/posts?limit=20");

      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBe(20);
      expect(res.body.is_restricted).toBe(false);
    });
  });

  describe("GET /api/search/trending", () => {
    function createSearchApp(queryMock) {
      jest.resetModules();
      const query = jest.fn(async (config) => queryMock(config));
      const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

      jest.doMock("../src/config/db", () => ({ query }));
      jest.doMock("../src/utils/logger", () => logger);

      const app = express();
      app.use(express.json());
      const searchRoutes = require("../src/routes/search");
      app.use("/api/search", searchRoutes);

      return { app, query };
    }

    it("GET /api/search/trending returns list of popular query strings", async () => {
      const { app } = createSearchApp(async ({ text }) => {
        const sql = String(text || "");
        if (sql.includes("SELECT query FROM")) {
          return {
            rows: [
              { query: "iphone 15 pro max" },
              { query: "macbook air m2" },
              { query: "honda city" },
            ],
          };
        }
        throw new Error(`Unexpected query in trending test: ${sql}`);
      });

      const res = await request(app).get("/api/search/trending");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          queries: expect.arrayContaining(["iphone 15 pro max", "macbook air m2", "honda city"]),
        })
      );
    });
  });
});
