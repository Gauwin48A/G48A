import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Core route smoke contract", () => {
  it("keeps critical marketplace routes mapped to concrete pages", () => {
    const appFilePath = path.resolve(process.cwd(), "src/App.jsx");
    const source = readFileSync(appFilePath, "utf8").replace(/\s+/g, "");

    expect(source).toContain('path="/sell"element={<RequireAuth><AddPostPage/></RequireAuth>}');
    expect(source).toContain('path="/listings"element={<AllPostsPage/>}');
    expect(source).toContain('path="/my-home"element={<RequireAuth><MyHomePage/></RequireAuth>}');
    expect(source).toContain('path="/notifications"element={<RequireAuth><NotificationsPage/></RequireAuth>}');
    expect(source).toContain('path="/recently-viewed"element={<RequireAuth><RecentlyViewedPage/></RequireAuth>}');
    expect(source).toContain('path="/search"element={<SearchPage/>}');
    expect(source).toContain('path="/rewards"element={<RequireAuth><RewardsPage/></RequireAuth>}');

    expect(source).not.toContain('path="/sell"element={<Navigateto="/post-welcome"replace/>}');
    expect(source).not.toContain('path="/listings"element={<Navigateto="/all-posts"replace/>}');
  });
});
