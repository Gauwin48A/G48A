// @vitest-environment jsdom

import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import AuthEventRouter from "@/components/AuthEventRouter";

afterEach(() => {
  cleanup();
});

function RouteProbe() {
  const location = useLocation();
  const state = location.state || {};

  return (
    <div>
      <div data-testid="pathname">{location.pathname}</div>
      <div data-testid="search">{location.search}</div>
      <div data-testid="returnTo">{state.returnTo || ""}</div>
    </div>
  );
}

function renderRouter(initialEntry = "/feed?category=mobiles") {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthEventRouter />
      <Routes>
        <Route path="/feed" element={<RouteProbe />} />
        <Route path="/login" element={<RouteProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthEventRouter", () => {
  it("redirects to login with returnTo state when auth-required event is emitted", async () => {
    renderRouter("/feed?category=mobiles");

    window.dispatchEvent(
      new CustomEvent("mhub:auth-required", {
        detail: { redirectTo: "/login?expired=true" },
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("pathname").textContent).toBe("/login");
      expect(screen.getByTestId("search").textContent).toBe("?expired=true");
      expect(screen.getByTestId("returnTo").textContent).toBe("/feed?category=mobiles");
    });
  });

  it("does not overwrite state when already on login route", async () => {
    renderRouter("/login");

    window.dispatchEvent(
      new CustomEvent("mhub:auth-required", {
        detail: { redirectTo: "/login?expired=true" },
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("pathname").textContent).toBe("/login");
      expect(screen.getByTestId("search").textContent).toBe("");
      expect(screen.getByTestId("returnTo").textContent).toBe("");
    });
  });
});
