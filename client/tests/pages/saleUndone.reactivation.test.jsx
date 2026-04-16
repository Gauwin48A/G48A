// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SaleUndone from "@/pages/SaleUndone";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => hoisted.navigate,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: hoisted.toast,
  }),
}));

vi.mock("@/lib/networkConfig", () => ({
  buildApiPath: (path = "") => `http://localhost:5001/api${path}`,
}));

describe("SaleUndone reactivation flow", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("authToken", "token-123");
    hoisted.navigate.mockReset();
    hoisted.toast.mockReset();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("reactivates posts using /reactivate endpoint and avoids legacy /status endpoint", async () => {
    const originalFetch = globalThis.fetch;

    const fetchMock = vi.fn(async (input) => {
      const url = String(input);

      if (url.includes("/api/transactions/undone")) {
        return { ok: true, json: async () => [] };
      }

      if (url.includes("/api/posts/123/reactivate")) {
        return { ok: true, json: async () => ({ success: true }) };
      }

      return { ok: true, json: async () => ({}) };
    });

    globalThis.fetch = fetchMock;

    try {
      render(<SaleUndone />);

      fireEvent.change(await screen.findByLabelText(/post_id/i), {
        target: { value: "123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "reactivate_post" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "http://localhost:5001/api/posts/123/reactivate",
          expect.objectContaining({
            method: "POST",
          }),
        );
      });

      const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(calledUrls.some((url) => url.includes("/api/posts/123/status"))).toBe(false);
      expect(hoisted.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Post Reactivated"),
        }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("falls back to legacy /status when /reactivate is unavailable", async () => {
    const originalFetch = globalThis.fetch;

    const fetchMock = vi.fn(async (input, init = {}) => {
      const url = String(input);

      if (url.includes("/api/transactions/undone")) {
        return { ok: true, status: 200, json: async () => [] };
      }

      if (url.includes("/api/posts/123/reactivate")) {
        return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
      }

      if (url.includes("/api/posts/123/status")) {
        expect(init.method).toBe("PATCH");
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    globalThis.fetch = fetchMock;

    try {
      render(<SaleUndone />);

      fireEvent.change(await screen.findByLabelText(/post_id/i), {
        target: { value: "123" },
      });

      fireEvent.click(screen.getByRole("button", { name: "reactivate_post" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "http://localhost:5001/api/posts/123/status",
          expect.objectContaining({
            method: "PATCH",
          }),
        );
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("supports token fallback and normalizes 'Post ID: <id>' input", async () => {
    const originalFetch = globalThis.fetch;

    localStorage.removeItem("authToken");
    localStorage.setItem("token", "fallback-token");

    const fetchMock = vi.fn(async (input, init = {}) => {
      const url = String(input);

      if (url.includes("/api/transactions/undone")) {
        return { ok: true, status: 200, json: async () => [] };
      }

      if (url.includes("/api/posts/126/reactivate")) {
        const authHeader = init?.headers?.Authorization ?? init?.headers?.authorization;
        expect(String(authHeader || "")).toContain("fallback-token");
        return { ok: true, status: 200, json: async () => ({ success: true }) };
      }

      return { ok: true, status: 200, json: async () => ({}) };
    });

    globalThis.fetch = fetchMock;

    try {
      render(<SaleUndone />);

      fireEvent.change(await screen.findByLabelText(/post_id/i), {
        target: { value: "Post ID: 126" },
      });

      fireEvent.click(screen.getByRole("button", { name: "reactivate_post" }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "http://localhost:5001/api/posts/126/reactivate",
          expect.objectContaining({
            method: "POST",
          }),
        );
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
