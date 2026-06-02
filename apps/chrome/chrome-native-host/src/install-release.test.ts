import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "../install-release.sh");
const releaseExtensionId = "hoblepbiofcahbbaobbfhhfhiihdekan";

describe("release installer", () => {
  test("defaults to the GitHub Release extension ID", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain(`RELEASE_EXTENSION_ID="${releaseExtensionId}"`);
    expect(source).toContain('EXTENSION_ID="${PLANNOTATOR_CHROME_EXTENSION_ID:-$RELEASE_EXTENSION_ID}"');
    expect(source).not.toContain("Chrome Web Store extension ID");
  });

  test("keeps development extension ID override and release pin options", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain("--extension-id");
    expect(source).toContain("EXTENSION_ID=\"$2\"");
    expect(source).toContain("--version");
    expect(source).toContain("PLANNOTATOR_CHROME_BASE_URL");
    expect(source).toContain("https://github.com/$REPO/releases/download/$VERSION");
    expect(source).toContain("https://github.com/$REPO/releases/latest/download");
  });
});
