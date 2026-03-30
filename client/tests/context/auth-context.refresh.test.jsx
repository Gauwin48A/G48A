// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
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

function Harness() {
  const { refreshAuth, user } = useAuth();
  const [result, setResult] = useState("");
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const ok = await refreshAuth();
          setResult(ok ? "ok" : "fail");
        }}
      >
        Refresh
      </button>
      <div data-testid="result">{result}</div>
      <div data-testid="user">{user?.id || ""}</div>
    </div>
  );
}

describe("AuthContext refreshAuth", () => {
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
        return { id: "42", user_id: "42", name: "Refresh User" };
      }
      return {};
    });

    hoisted.apiPost.mockImplementation((path) => {
      if (path === "/auth/refresh-token") {
        return { token: "new-token", user: { id: "42", user_id: "42" } };
      }
      if (path === "/auth/logout") {
        return {};
      }
      return {};
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("refreshes session when no access token is present", async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.getByTestId("result").textContent).toBe("ok");
    });

    expect(localStorage.getItem("authToken")).toBe("new-token");
    expect(screen.getByTestId("user").textContent).toBe("42");
  });

  it("clears session when /auth/me is unauthorized and refresh fails", async () => {
    localStorage.setItem("authToken", "expired-token");
    localStorage.setItem("user", JSON.stringify({ id: "99" }));

    hoisted.apiGet.mockImplementation((path) => {
      if (path === "/auth/session") {
        return { authenticated: false, canRefresh: false };
      }
      if (path === "/auth/me") {
        const error = new Error("Unauthorized");
        error.status = 401;
        error.response = { status: 401 };
        throw error;
      }
      if (path === "/auth/csrf-token") {
        return {};
      }
      return {};
    });

    hoisted.apiPost.mockImplementation((path) => {
      if (path === "/auth/refresh-token") {
        const error = new Error("Refresh failed");
        error.status = 401;
        error.response = { status: 401 };
        throw error;
      }
      return {};
    });

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.getByTestId("result").textContent).toBe("fail");
    });

    expect(localStorage.getItem("authToken")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});
