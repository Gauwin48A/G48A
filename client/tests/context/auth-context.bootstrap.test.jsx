// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

const hoisted = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("@/services/api", () => ({
  default: {
    get: (...args) => hoisted.apiGet(...args),
    post: (...args) => hoisted.apiPost(...args),
  },
}));

vi.mock("@/services/authDiagnostics", () => ({
  logAuthDiagnostic: vi.fn(),
}));

function UserProbe() {
  const { user } = useAuth();
  return <div data-testid="user">{user?.id || ""}</div>;
}

describe("AuthContext bootstrapAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    hoisted.apiGet.mockImplementation((path) => {
      if (path === "/auth/session") {
        return { authenticated: false, canRefresh: false };
      }
      if (path === "/auth/csrf-token") {
        return {};
      }
      if (path === "/auth/me") {
        return { id: "42", user_id: "42", name: "Bootstrap User" };
      }
      return {};
    });

    hoisted.apiPost.mockImplementation((path) => {
      if (path === "/auth/refresh-token") {
        return { token: "new-token", user: { id: "42", user_id: "42" } };
      }
      return {};
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("hydrates from session and fetches user when authenticated without refresh", async () => {
    hoisted.apiGet.mockImplementation((path) => {
      if (path === "/auth/session") {
        return {
          authenticated: true,
          authState: "authenticated",
          hasRefreshCookie: false,
          canRefresh: false,
          user: { id: "7", user_id: "7" },
        };
      }
      if (path === "/auth/me") {
        return { id: "7", user_id: "7", name: "Session User" };
      }
      return {};
    });

    render(
      <AuthProvider>
        <UserProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("7");
    });

    expect(hoisted.apiPost).not.toHaveBeenCalled();
  });

  it("clears session when session endpoint requires reauth", async () => {
    localStorage.setItem("authToken", "expired-token");
    localStorage.setItem("user", JSON.stringify({ id: "99" }));
    localStorage.setItem("authSession", "true");

    hoisted.apiGet.mockImplementation((path) => {
      if (path === "/auth/session") {
        return {
          authenticated: false,
          authState: "revoked",
          hasRefreshCookie: true,
          canRefresh: false,
          requiresReauth: true,
        };
      }
      return {};
    });

    render(
      <AuthProvider>
        <UserProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("");
    });

    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(hoisted.apiPost).not.toHaveBeenCalled();
  });

  it("falls back to refreshAuth when session endpoint is missing", async () => {
    hoisted.apiGet.mockImplementation((path) => {
      if (path === "/auth/session") {
        const error = new Error("Not found");
        error.status = 404;
        error.response = { status: 404 };
        throw error;
      }
      if (path === "/auth/csrf-token") {
        return {};
      }
      if (path === "/auth/me") {
        return { id: "42", user_id: "42", name: "Fallback User" };
      }
      return {};
    });

    hoisted.apiPost.mockImplementation((path) => {
      if (path === "/auth/refresh-token") {
        return { token: "new-token", user: { id: "42", user_id: "42" } };
      }
      return {};
    });

    render(
      <AuthProvider>
        <UserProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("42");
    });

    expect(hoisted.apiPost).toHaveBeenCalledWith("/auth/refresh-token", {});
  });
});
