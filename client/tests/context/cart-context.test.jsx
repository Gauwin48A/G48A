// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

import { CartProvider, useCart } from "@/context/CartContext";

const STORAGE_KEY = "mhub_cart_v1";

function CartProbe() {
  const cart = useCart();

  return (
    <div>
      <button
        data-testid="add-item-1"
        onClick={() =>
          cart.addItem({
            id: 101,
            title: "Phone",
            price: 999,
            image: "/img.png",
            seller: "Seller",
            location: "Hyderabad",
          })
        }
      >
        add
      </button>
      <button
        data-testid="add-item-2"
        onClick={() =>
          cart.addItem({
            id: 202,
            title: "Laptop",
            price: 1999,
          })
        }
      >
        add2
      </button>
      <button data-testid="qty-up" onClick={() => cart.updateQty("101", 3)}>
        qty
      </button>
      <button data-testid="qty-zero" onClick={() => cart.updateQty("101", 0)}>
        zero
      </button>
      <button data-testid="clear" onClick={() => cart.clear()}>
        clear
      </button>
      <div data-testid="items">{JSON.stringify(cart.items)}</div>
      <div data-testid="totalCount">{String(cart.totalCount)}</div>
      <div data-testid="subtotal">{String(cart.subtotal)}</div>
      <div data-testid="inCart101">{String(cart.isInCart("101"))}</div>
    </div>
  );
}

function renderCartProbe() {
  return render(
    <CartProvider>
      <CartProbe />
    </CartProvider>,
  );
}

describe("CartContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps addItem idempotent for the same listing id", () => {
    renderCartProbe();

    act(() => {
      screen.getByTestId("add-item-1").click();
      screen.getByTestId("add-item-1").click();
      screen.getByTestId("add-item-1").click();
    });

    const items = JSON.parse(screen.getByTestId("items").textContent || "[]");
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("101");
    expect(items[0].qty).toBe(1);
    expect(screen.getByTestId("totalCount").textContent).toBe("1");
    expect(screen.getByTestId("inCart101").textContent).toBe("true");
  });

  it("supports qty updates and removes item when qty is set to zero", () => {
    renderCartProbe();

    act(() => {
      screen.getByTestId("add-item-1").click();
      screen.getByTestId("qty-up").click();
    });

    expect(screen.getByTestId("totalCount").textContent).toBe("3");
    expect(screen.getByTestId("subtotal").textContent).toBe("2997");

    act(() => {
      screen.getByTestId("qty-zero").click();
    });

    expect(screen.getByTestId("items").textContent).toBe("[]");
    expect(screen.getByTestId("totalCount").textContent).toBe("0");
    expect(screen.getByTestId("inCart101").textContent).toBe("false");
  });

  it("hydrates from localStorage and persists updates", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: "999", title: "Stored", price: 50, qty: 2 }]),
    );

    renderCartProbe();

    expect(screen.getByTestId("totalCount").textContent).toBe("2");
    expect(screen.getByTestId("subtotal").textContent).toBe("100");

    act(() => {
      screen.getByTestId("add-item-2").click();
    });

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    expect(stored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "999" }),
        expect.objectContaining({ id: "202", qty: 1 }),
      ]),
    );
  });
});

