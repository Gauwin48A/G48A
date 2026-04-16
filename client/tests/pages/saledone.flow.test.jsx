// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SaleDone from "@/pages/Saledone";

const hoisted = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
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

vi.mock("@/services/api", () => ({
  default: {
    get: (...args) => hoisted.apiGet(...args),
    post: (...args) => hoisted.apiPost(...args),
  },
}));

describe("SaleDone live flow", () => {
  beforeEach(() => {
    hoisted.navigate.mockReset();
    hoisted.toast.mockReset();
    hoisted.apiGet.mockReset();
    hoisted.apiPost.mockReset();
    hoisted.apiGet.mockResolvedValue({ pendingSales: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it("initiates sale using backend API and prefills buyer transaction id", async () => {
    hoisted.apiPost.mockResolvedValue({
      transaction: {
        transactionId: "tx-101",
        secretOTP: "123456",
        otpExpiresIn: "10 minutes",
      },
      instructions: "Share transaction id and OTP",
    });

    render(<SaleDone />);

    fireEvent.change(screen.getByLabelText("Post ID"), {
      target: { value: "126" },
    });
    fireEvent.change(screen.getByLabelText("Buyer User ID"), {
      target: { value: "42" },
    });
    fireEvent.change(screen.getByLabelText("sale_amount (INR)"), {
      target: { value: "5000" },
    });

    fireEvent.click(screen.getByRole("button", { name: "initiate_sale_confirmation" }));

    await waitFor(() => {
      expect(hoisted.apiPost).toHaveBeenCalledWith("/sale/initiate", {
        postId: "126",
        buyerId: "42",
        agreedPrice: 5000,
      });
    });

    expect(await screen.findByDisplayValue("tx-101")).toBeTruthy();
  });

  it("confirms sale via backend API and navigates to my-home sold tab", async () => {
    hoisted.apiPost
      .mockResolvedValueOnce({
        transaction: {
          transactionId: "tx-202",
          secretOTP: "123456",
          otpExpiresIn: "10 minutes",
        },
      })
      .mockResolvedValueOnce({
        message: "Sale confirmed successfully!",
        transaction: {
          transactionId: "tx-202",
          status: "completed",
        },
      });

    render(<SaleDone />);

    fireEvent.change(screen.getByLabelText("Post ID"), {
      target: { value: "126" },
    });
    fireEvent.change(screen.getByLabelText("Buyer User ID"), {
      target: { value: "42" },
    });
    fireEvent.change(screen.getByLabelText("sale_amount (INR)"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "initiate_sale_confirmation" }));

    await screen.findByDisplayValue("tx-202");
    fireEvent.change(screen.getByPlaceholderText("Enter OTP"), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: "confirm_purchase" }));

    await waitFor(() => {
      expect(hoisted.apiPost).toHaveBeenCalledWith("/sale/confirm", {
        transactionId: "tx-202",
        otp: "123456",
      });
    });

    fireEvent.click(await screen.findByRole("button", { name: "go_to_my_home" }));

    expect(hoisted.navigate).toHaveBeenCalledWith("/my-home", {
      state: {
        focusTab: "sold",
        saleCompleted: true,
        transactionId: "tx-202",
      },
    });
  });
});
