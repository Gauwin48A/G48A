// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

describe("ui/select", () => {
  afterEach(() => {
    cleanup();
  });

  it("opens options and selects an item in uncontrolled mode", () => {
    const onValueChange = vi.fn();

    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select condition" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="good">Good</SelectItem>
        </SelectContent>
      </Select>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("option", { name: "New" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Good" })).toBeTruthy();

    fireEvent.click(screen.getByRole("option", { name: "Good" }));

    expect(onValueChange).toHaveBeenCalledWith("good");
    expect(screen.getByText("Good")).toBeTruthy();
  });

  it("respects controlled value updates", () => {
    const onValueChange = vi.fn();

    const { rerender } = render(
      <Select value="new" onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select brand" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="good">Good</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByText("New")).toBeTruthy();

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { name: "Good" }));
    expect(onValueChange).toHaveBeenCalledWith("good");

    rerender(
      <Select value="good" onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select brand" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="good">Good</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByText("Good")).toBeTruthy();
  });

  it("keeps dropdown content full width to avoid clipped form menus", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="books">Books</SelectItem>
          <SelectItem value="electronics">Electronics</SelectItem>
        </SelectContent>
      </Select>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select category" }));

    const listbox = screen.getByRole("listbox");
    const content = listbox.parentElement;
    expect(content).toBeTruthy();
    expect(content.className).toContain("w-full");
    expect(content.className).not.toContain("min-w-[8rem]");
  });
});
