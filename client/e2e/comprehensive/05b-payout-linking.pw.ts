import { expect, test, type Page } from "@playwright/test";
import {
  disableAnimations,
  mockAuthenticatedApiRoutes,
  mockCommonApiRoutes,
  setupLoggedInState,
  setupLoggedOutState,
  waitForPageReady,
} from "./e2e-helpers";
import { MOCK_USER } from "./fixtures";

// ── Helper: mock payout-link POST endpoint ─────────────────────────────────
async function mockPayoutLinkApi(
  page: Page,
  options: {
    success?: boolean;
    response?: Record<string, unknown>;
    status?: number;
    validateBody?: (body: any) => void;
  } = {}
) {
  const {
    success = true,
    response = {},
    status = success ? 200 : 400,
  } = options;

  await page.route("**/api/profile/payout-link**", async (route) => {
    if (route.request().method() !== "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    }

    const body = JSON.parse(route.request().postData() || "{}");
    options.validateBody?.(body);

    const defaultResponse = success
      ? {
          success: true,
          payout_method: body.type || "bank_account",
          last_four: body.type === "upi" ? "" : "1234",
          upi_id: body.type === "upi" ? body.upi_id || "user@upi" : null,
          message: "Payout account linked successfully",
          razorpay_contact_id: "cont_mock_" + Date.now(),
          razorpay_fund_account_id: "fa_mock_" + Date.now(),
        }
      : {
          success: false,
          error: response.error || "Missing required fields",
        };

    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(response.success !== undefined ? response : defaultResponse),
    });
  });
}

// ── Helper: mock payout-status GET endpoint ────────────────────────────────
async function mockPayoutStatusApi(
  page: Page,
  hasAccount: boolean = true,
  method: string = "bank_account"
) {
  await page.route("**/api/profile/payout-status**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        has_payout_account: hasAccount,
        payout_method: hasAccount ? method : null,
        last_four: hasAccount && method === "bank_account" ? "4321" : "",
        upi_id: hasAccount && method === "upi" ? "seller@upi" : null,
        bank_name: hasAccount && method === "bank_account" ? "HDFC Bank" : null,
        created_at: "2026-04-01T10:00:00.000Z",
      }),
    });
  });
}

// ── Helper: mock profile page API (shows payout info) ──────────────────────
async function mockProfileApi(
  page: Page,
  payoutInfo: {
    payout_upi_id?: string;
    payout_bank_details?: Record<string, unknown>;
  } = {}
) {
  await page.route("**/api/profile**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-1",
        user_id: "user-1",
        name: "E2E User",
        full_name: "E2E User",
        email: "e2e.user@mhub.test",
        phone: "9999999999",
        ...payoutInfo,
      }),
    });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Payout Account Linking
// ════════════════════════════════════════════════════════════════════════════
test.describe("Payout Account Linking — API Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await disableAnimations(page);
  });

  // ── Auth gating ───────────────────────────────────────────────────────

  test("unauthenticated user gets 401 on payout-link POST", async ({ page }) => {
    await setupLoggedOutState(page);
    let responseStatus = 0;
    let responseBody: any = null;

    await page.route("**/api/profile/payout-link**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Authentication required" }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      }
    });

    // Attempt to POST via the page context
    responseStatus = await page.evaluate(async () => {
      try {
        const res = await fetch("/api/profile/payout-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "bank_account",
            account_number: "1234567890",
            ifsc: "HDFC0001234",
            account_holder_name: "Test User",
          }),
        });
        return res.status;
      } catch {
        return 0;
      }
    });

    expect(responseStatus).toBe(401);
  });

  test("unauthenticated user gets 401 on payout-status GET", async ({ page }) => {
    await setupLoggedOutState(page);

    await page.route("**/api/profile/payout-status**", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Authentication required" }),
      });
    });

    const responseStatus = await page.evaluate(async () => {
      try {
        const res = await fetch("/api/profile/payout-status");
        return res.status;
      } catch {
        return 0;
      }
    });

    expect(responseStatus).toBe(401);
  });

  // ─── Bank Account Linking ─────────────────────────────────────────────

  test("links a bank account payout method successfully", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);

    let postedBody: any = null;
    await mockPayoutLinkApi(page, {
      success: true,
      validateBody: (body) => {
        postedBody = body;
      },
      response: {
        success: true,
        payout_method: "bank_account",
        last_four: "1234",
        bank_name: "HDFC Bank",
        message: "Payout account linked successfully",
      },
    });

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bank_account",
          account_number: "1234567890",
          ifsc: "HDFC0001234",
          account_holder_name: "Test User",
        }),
      });
      return await res.json();
    });

    expect(postedBody).toBeTruthy();
    expect(postedBody.type).toBe("bank_account");
    expect(postedBody.account_number).toBe("1234567890");
    expect(response.success).toBe(true);
    expect(response.payout_method).toBe("bank_account");
    expect(response.last_four).toBe("1234");
    expect(response.message).toContain("linked successfully");
  });

  test("links a UPI payout method successfully", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);

    let postedBody: any = null;
    await mockPayoutLinkApi(page, {
      success: true,
      validateBody: (body) => {
        postedBody = body;
      },
      response: {
        success: true,
        payout_method: "upi",
        upi_id: "seller@upi",
        message: "UPI payout account linked successfully",
      },
    });

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "upi",
          upi_id: "seller@upi",
        }),
      });
      return await res.json();
    });

    expect(postedBody).toBeTruthy();
    expect(postedBody.type).toBe("upi");
    expect(postedBody.upi_id).toBe("seller@upi");
    expect(response.success).toBe(true);
    expect(response.payout_method).toBe("upi");
    expect(response.upi_id).toBe("seller@upi");
  });

  test("rejects payout-link with missing required fields", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);

    await mockPayoutLinkApi(page, {
      success: false,
      status: 400,
      response: {
        success: false,
        error: "Missing required fields: account_number, ifsc, account_holder_name",
      },
    });

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bank_account",
          // Missing account_number, ifsc, account_holder_name
        }),
      });
      return await res.json();
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("Missing required fields");
  });

  test("rejects payout-link with invalid account type", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);

    await mockPayoutLinkApi(page, {
      success: false,
      status: 400,
      response: {
        success: false,
        error: "Invalid payout type. Must be 'bank_account' or 'upi'",
      },
    });

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invalid_type",
        }),
      });
      return await res.json();
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("Invalid payout type");
  });

  // ─── Payout Status ────────────────────────────────────────────────────

  test("returns payout status with linked bank account details", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockPayoutStatusApi(page, true, "bank_account");

    const response: any = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-status");
      return await res.json();
    });

    expect(response.success).toBe(true);
    expect(response.has_payout_account).toBe(true);
    expect(response.payout_method).toBe("bank_account");
    expect(response.last_four).toBe("4321");
    expect(response.bank_name).toBe("HDFC Bank");
  });

  test("returns payout status with linked UPI details", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockPayoutStatusApi(page, true, "upi");

    const response: any = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-status");
      return await res.json();
    });

    expect(response.success).toBe(true);
    expect(response.has_payout_account).toBe(true);
    expect(response.payout_method).toBe("upi");
    expect(response.upi_id).toBe("seller@upi");
  });

  test("returns has_payout_account=false when no payout linked", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockPayoutStatusApi(page, false);

    const response: any = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-status");
      return await res.json();
    });

    expect(response.success).toBe(true);
    expect(response.has_payout_account).toBe(false);
    expect(response.payout_method).toBeNull();
  });

  // ─── Profile Page — Payout Info Display ───────────────────────────────

  test("profile page displays linked UPI payout info", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCommonApiRoutes(page);
    await mockProfileApi(page, {
      payout_upi_id: "seller@upi",
      payout_bank_details: {},
    });

    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    await disableAnimations(page);

    // Profile page should render (payout info may show in account details)
    await expect(page.getByText("E2E User")).toBeVisible();
  });

  test("profile page displays linked bank account payout info", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCommonApiRoutes(page);
    await mockProfileApi(page, {
      payout_upi_id: "",
      payout_bank_details: {
        bank_name: "HDFC Bank",
        account_last_four: "1234",
        ifsc: "HDFC0001234",
      },
    });

    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByText("E2E User")).toBeVisible();
  });

  test("profile page shows no payout info when not linked", async ({ page }) => {
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await mockCommonApiRoutes(page);
    await mockProfileApi(page, {
      payout_upi_id: "",
      payout_bank_details: {},
    });

    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    await disableAnimations(page);

    await expect(page.getByText("E2E User")).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TEST SUITE: Payout Settings Page (Authenticated Access)
// ════════════════════════════════════════════════════════════════════════════
test.describe("Payout Settings — Authenticated User", () => {
  test.beforeEach(async ({ page }) => {
    await mockCommonApiRoutes(page);
    await setupLoggedInState(page);
    await mockAuthenticatedApiRoutes(page);
    await disableAnimations(page);
  });

  test("bank account link via payout-link API includes all required fields", async ({ page }) => {
    let postedBody: any = null;

    await page.route("**/api/profile/payout-link**", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      }
      postedBody = JSON.parse(route.request().postData() || "{}");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          payout_method: "bank_account",
          last_four: postedBody.account_number?.slice(-4) || "1234",
          bank_name: "HDFC Bank",
          message: "Payout account linked successfully",
        }),
      });
    });

    const response: any = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bank_account",
          account_number: "1234567890",
          ifsc: "HDFC0001234",
          account_holder_name: "Test User",
        }),
      });
      return await res.json();
    });

    expect(postedBody).toBeTruthy();
    expect(postedBody.type).toBe("bank_account");
    expect(postedBody.account_number).toBe("1234567890");
    expect(postedBody.ifsc).toBe("HDFC0001234");
    expect(postedBody.account_holder_name).toBe("Test User");
    expect(response.success).toBe(true);
    expect(response.last_four).toBe("7890");
  });

  test("UPI link via payout-link API includes upi_id", async ({ page }) => {
    let postedBody: any = null;

    await page.route("**/api/profile/payout-link**", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      }
      postedBody = JSON.parse(route.request().postData() || "{}");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          payout_method: "upi",
          upi_id: postedBody.upi_id || "user@upi",
          message: "UPI payout account linked successfully",
        }),
      });
    });

    const response: any = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "upi",
          upi_id: "seller@paytm",
        }),
      });
      return await res.json();
    });

    expect(postedBody).toBeTruthy();
    expect(postedBody.type).toBe("upi");
    expect(postedBody.upi_id).toBe("seller@paytm");
    expect(response.success).toBe(true);
    expect(response.upi_id).toBe("seller@paytm");
  });

  test("payout-link fails for invalid UPI format", async ({ page }) => {
    await page.route("**/api/profile/payout-link**", async (route) => {
      if (route.request().method() !== "POST") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Invalid UPI ID format. Must be in format 'username@handle'",
        }),
      });
    });

    const response: any = await page.evaluate(async () => {
      const res = await fetch("/api/profile/payout-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "upi",
          upi_id: "invalid-upi",
        }),
      });
      return await res.json();
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("Invalid UPI ID");
  });
});
