import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "../install-release.sh");

describe("release installer", () => {
  test("requires an explicit extension ID until production ID is configured", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain('PRODUCTION_EXTENSION_ID=""');
    expect(source).toContain("Production Chrome Web Store extension ID is not configured yet.");
    expect(source).toContain("Pass --extension-id <id> for an unpacked or reviewer extension build.");
  });

  test("keeps development extension ID override and release pin options", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain("--extension-id");
    expect(source).toContain("EXTENSION_ID=\"$2\"");
    expect(source).toContain("--version");
    expect(source).toContain("https://github.com/$REPO/releases/download/$VERSION");
    expect(source).toContain("https://github.com/$REPO/releases/latest/download");
  });
});
