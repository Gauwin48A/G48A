function loadOrdersControllerWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(async (queryConfig) => queryImpl(queryConfig));
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const financialEngine = {
    calculateSettlement: jest.fn((totalAmount, commissionRate) => ({
      agreedPrice: totalAmount,
      commissionRate,
      platformFee: totalAmount * commissionRate,
      netFee: (totalAmount * commissionRate) / 1.18,
      gstRate: 0.18,
      gstOnFee: (totalAmount * commissionRate) - ((totalAmount * commissionRate) / 1.18),
      sellerPayout: totalAmount * (1 - commissionRate),
    })),
    createFinancialSnapshot: jest.fn(async () => ({})),
  };

  jest.doMock("../src/config/db", () => ({ query }));
  jest.doMock("../src/utils/logger", () => logger);
  jest.doMock("../src/services/financialEngine", () => financialEngine);

  const controller = require("../src/controllers/ordersController");
  return { controller, query, logger, financialEngine };
}

function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe("Orders Controller Enhancements (Batch 2)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("POST /api/orders/create with postId locks post FOR UPDATE, reserves post, and creates order with OTP", async () => {
    let postLocked = false;
    let postReserved = false;

    const { controller } = loadOrdersControllerWithQueryMock(async ({ text, values }) => {
      const sql = String(text || "");

      if (sql.includes("CREATE SEQUENCE") || sql.includes("ALTER TABLE orders")) {
        return { rows: [] };
      }

      if (sql.includes("FROM posts") && sql.includes("FOR UPDATE")) {
        expect(values).toEqual(["post_777"]);
        postLocked = true;
        return {
          rows: [
            {
              post_id: "post_777",
              user_id: "seller_888",
              title: "MacBook Pro M2",
              price: "95000",
              status: "active",
            },
          ],
        };
      }

      if (sql.includes("UPDATE posts SET status = 'reserved'") && sql.includes("post_id::text = $1")) {
        postReserved = true;
        return { rows: [] };
      }

      if (sql.includes("SELECT nextval('order_number_seq')")) {
        return { rows: [{ seq: "1055" }] };
      }

      if (sql.includes("INSERT INTO orders")) {
        return {
          rows: [
            {
              order_id: 101,
              order_number: "ZRD-2026-001055",
              buyer_id: "buyer_111",
              seller_id: "seller_888",
              post_id: "post_777",
              total_amount: 95000,
              platform_fee: 2375,
              seller_payout: 92625,
              status: "PENDING",
              escrow_status: "HELD",
              handover_otp: "654321",
            },
          ],
        };
      }

      if (sql.includes("INSERT INTO order_items")) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query in create order test: ${sql}`);
    });

    const req = {
      user: { userId: "buyer_111" },
      body: {
        postId: "post_777",
        amount: 95000,
        addressId: "123 Tech Park, Bengaluru - 560001",
        paymentMethod: "UPI",
      },
    };
    const res = createResponseMock();

    await controller.create(req, res);

    expect(postLocked).toBe(true);
    expect(postReserved).toBe(true);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        orderId: "101",
        orderNumber: "ZRD-2026-001055",
        order: expect.objectContaining({
          total_amount: 95000,
          escrow_status: "HELD",
        }),
      })
    );
  });

  it("POST /api/orders/create prevents double-selling: rejects reserved post with 409 Conflict", async () => {
    const { controller } = loadOrdersControllerWithQueryMock(async ({ text }) => {
      const sql = String(text || "");
      if (sql.includes("CREATE SEQUENCE") || sql.includes("ALTER TABLE orders")) return { rows: [] };
      if (sql.includes("FROM posts")) {
        return {
          rows: [
            {
              post_id: "post_777",
              user_id: "seller_888",
              title: "MacBook Pro M2",
              price: "95000",
              status: "reserved", // Already reserved by another buyer
            },
          ],
        };
      }
      throw new Error(`Unexpected query in double-selling test: ${sql}`);
    });

    const req = {
      user: { userId: "buyer_222" },
      body: { postId: "post_777", amount: 95000 },
    };
    const res = createResponseMock();

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("already reserved"),
      })
    );
  });

  it("POST /api/orders/create rejects buying own listing with 400", async () => {
    const { controller } = loadOrdersControllerWithQueryMock(async ({ text }) => {
      const sql = String(text || "");
      if (sql.includes("CREATE SEQUENCE") || sql.includes("ALTER TABLE orders")) return { rows: [] };
      if (sql.includes("FROM posts")) {
        return {
          rows: [
            {
              post_id: "post_777",
              user_id: "user_same",
              title: "My Own Laptop",
              price: "50000",
              status: "active",
            },
          ],
        };
      }
      throw new Error(`Unexpected query in own-listing test: ${sql}`);
    });

    const req = {
      user: { userId: "user_same" },
      body: { postId: "post_777" },
    };
    const res = createResponseMock();

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Cannot purchase your own listing"),
      })
    );
  });

  it("POST /api/orders/:id/confirm-handover verifies buyer OTP, marks COMPLETED and releases escrow", async () => {
    let postMarkedSold = false;

    const { controller } = loadOrdersControllerWithQueryMock(async ({ text, values }) => {
      const sql = String(text || "");

      if (sql.includes("SELECT * FROM orders WHERE order_id::text = $1")) {
        return {
          rows: [
            {
              order_id: 101,
              order_number: "ZRD-2026-001055",
              buyer_id: "buyer_111",
              seller_id: "seller_888",
              post_id: "post_777",
              handover_otp: "789123",
              status: "PAID",
              escrow_status: "HELD",
            },
          ],
        };
      }

      if (sql.includes("UPDATE orders SET") && sql.includes("escrow_status = 'RELEASED'")) {
        return {
          rows: [
            {
              order_id: 101,
              status: "COMPLETED",
              escrow_status: "RELEASED",
            },
          ],
        };
      }

      if (sql.includes("UPDATE posts SET status = 'sold'")) {
        expect(values).toEqual(["post_777"]);
        postMarkedSold = true;
        return { rows: [] };
      }

      throw new Error(`Unexpected query in confirm-handover test: ${sql}`);
    });

    const req = {
      user: { userId: "buyer_111" },
      params: { id: "101" },
      body: { otp: "789123" },
    };
    const res = createResponseMock();

    await controller.confirmHandover(req, res);

    expect(postMarkedSold).toBe(true);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining("Escrow funds released"),
        order: expect.objectContaining({
          status: "COMPLETED",
          escrow_status: "RELEASED",
        }),
      })
    );
  });

  it("POST /api/orders/:id/confirm-handover rejects incorrect OTP with 400", async () => {
    const { controller } = loadOrdersControllerWithQueryMock(async () => ({
      rows: [
        {
          order_id: 101,
          buyer_id: "buyer_111",
          seller_id: "seller_888",
          handover_otp: "789123",
          status: "PAID",
        },
      ],
    }));

    const req = {
      user: { userId: "buyer_111" },
      params: { id: "101" },
      body: { otp: "000000" }, // Wrong OTP
    };
    const res = createResponseMock();

    await controller.confirmHandover(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Incorrect Handover OTP"),
      })
    );
  });

  it("GET /api/orders/my returns buyer's orders list", async () => {
    const { controller } = loadOrdersControllerWithQueryMock(async ({ values }) => {
      expect(values).toEqual(["buyer_111"]);
      return {
        rows: [
          {
            order_id: "ZRD-2026-001055",
            title: "MacBook Pro M2",
            item_price: "95000",
            total_amount: "95000",
            status: "PAID",
            escrow_status: "HELD",
            seller_name: "Seller John",
          },
        ],
      };
    });

    const req = {
      user: { userId: "buyer_111" },
    };
    const res = createResponseMock();

    await controller.myOrders(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          order_id: "ZRD-2026-001055",
          title: "MacBook Pro M2",
          status: "PAID",
          escrow_status: "HELD",
        }),
      ])
    );
  });

  it("GET /api/v1/orders/:id rejects IDOR attempt by unauthorized third-party user with 403", async () => {
    const { controller } = loadOrdersControllerWithQueryMock(async () => ({
      rows: [
        {
          order_id: 101,
          buyer_id: "buyer_111",
          seller_id: "seller_888",
        },
      ],
    }));

    const req = {
      user: { userId: "attacker_999" }, // Neither buyer nor seller
      params: { id: "101" },
    };
    const res = createResponseMock();

    await controller.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining("Access denied"),
      })
    );
  });
});
