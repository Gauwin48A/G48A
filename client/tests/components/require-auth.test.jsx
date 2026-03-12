// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { cleanup, render, screen } from "@testing-library/react";

import RequireAuth from "@/components/RequireAuth";

const authState = {
  user: null,
  isAuthenticated: false,
  loading: false,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => authState,
}));

afterEach(() => {
  cleanup();
  authState.user = null;
  authState.isAuthenticated = false;
  authState.loading = false;
});

function renderWithRoute(initialEntry = "/private") {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/private"
          element={
            <RequireAuth>
              <div data-testid="private">Private</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div data-testid="login">Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("redirects unauthenticated users to login with returnTo", () => {
    renderWithRoute("/private?from=feed");

    expect(screen.queryByTestId("private")).toBeNull();
    expect(screen.getByTestId("login")).toBeTruthy();
  });

  it("renders children when authenticated", () => {
    authState.isAuthenticated = true;
    authState.user = { id: "1", name: "Tester" };

    renderWithRoute("/private");

    expect(screen.getByTestId("private")).toBeTruthy();
  });

  it("defers rendering while auth is loading", () => {
    authState.loading = true;

    renderWithRoute("/private");

    expect(screen.queryByTestId("private")).toBeNull();
    expect(screen.queryByTestId("login")).toBeNull();
  });
});
