import { describe, expect, it } from "vitest";
import {
  buildActiveAppMatcher,
  matchesCategoryModeItem,
  normalizeAppGroup,
  normalizeCategoryToken,
} from "@/utils/categoryModeFilters";

describe("categoryModeFilters normalization", () => {
  it("normalizes category text across hyphen and underscore variants", () => {
    expect(normalizeCategoryToken("Home_Appliances")).toBe("home appliances");
    expect(normalizeCategoryToken("home-appliances")).toBe("home appliances");
  });

  it("maps app aliases into valid app groups", () => {
    expect(normalizeAppGroup("mobile-phones")).toBe("electronics");
    expect(normalizeAppGroup("AUTO PARTS")).toBe("vehicles");
    expect(normalizeAppGroup("other")).toBe("others");
  });

  it("matches category-mode items by normalized app group or category name", () => {
    const matcher = buildActiveAppMatcher("electronics", [
      { category_id: 1, name: "Home Appliances", category_group: "electronics" },
      { category_id: 2, name: "Cars", category_group: "vehicles" },
    ]);

    expect(
      matchesCategoryModeItem(
        { category_group: "electronic-devices", category_name: "Home_Appliances" },
        { activeAppMatcher: matcher },
      ),
    ).toBe(true);

    expect(
      matchesCategoryModeItem(
        { category_group: "vehicles", category_name: "Cars" },
        { activeAppMatcher: matcher },
      ),
    ).toBe(false);

    expect(
      matchesCategoryModeItem(
        { category_name: "home-appliances" },
        { activeCategory: { name: "home appliances" } },
      ),
    ).toBe(true);
  });
});
