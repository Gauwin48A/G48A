import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("My Posts route contract", () => {
  it("keeps /my-posts mapped to the same page component as /my-feed", () => {
    const appFilePath = path.resolve(process.cwd(), "src/App.jsx");
    const source = readFileSync(appFilePath, "utf8").replace(/\s+/g, "");

    expect(source).toContain('path:"/my-feed",element:e.createElement(S,null)');
    expect(source).toContain('path:"/my-posts",element:e.createElement(S,null)');
  });
});
