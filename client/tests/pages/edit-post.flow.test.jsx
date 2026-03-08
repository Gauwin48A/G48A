// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EditPost from "@/pages/EditPost";
import api from "@/services/api";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: vi.fn(),
  authUser: { id: 42, user_id: 42, name: "Test User" },
  isAuthed: true,
}));

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
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

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: hoisted.authUser,
  }),
}));

vi.mock("@/utils/authStorage", () => ({
  isAuthenticated: () => hoisted.isAuthed,
}));

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("EditPost flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.navigate.mockReset();
    hoisted.toast.mockReset();
    hoisted.authUser = { id: 42, user_id: 42, name: "Test User" };
    hoisted.isAuthed = true;
  });

  afterEach(() => {
    cleanup();
  });

  it("gates unauthenticated users and routes login with return path", async () => {
    hoisted.isAuthed = false;

    render(
      <MemoryRouter initialEntries={["/edit-post/42"]} future={routerFuture}>
        <Routes>
          <Route path="/edit-post/:postId" element={<EditPost />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Login required");
    fireEvent.click(screen.getByRole("button", { name: "Go to Login" }));

    expect(hoisted.navigate).toHaveBeenCalledWith("/login", {
      state: { returnTo: "/edit-post/42" },
    });
  });

  it("loads listing and submits update", async () => {
    api.get.mockResolvedValueOnce({
      post: {
        post_id: 42,
        title: "Original Title",
        description: "Original description content",
        price: 1000,
        location: "Delhi",
        status: "active",
      },
    });
    api.put.mockResolvedValueOnce({ message: "Post updated successfully" });

    render(
      <MemoryRouter initialEntries={["/edit-post/42"]} future={routerFuture}>
        <Routes>
          <Route path="/edit-post/:postId" element={<EditPost />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByDisplayValue("Original Title");

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Updated Title" },
    });
    fireEvent.change(screen.getByLabelText("Price (INR)"), {
      target: { value: "1200" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith("/posts/42", {
        title: "Updated Title",
        description: "Original description content",
        price: 1200,
        location: "Delhi",
        status: "active",
      });
    });

    expect(hoisted.navigate).toHaveBeenCalledWith("/my-home", {
      state: { focusTab: "active" },
    });
  });
});
