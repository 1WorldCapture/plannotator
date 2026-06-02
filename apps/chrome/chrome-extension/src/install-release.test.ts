import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const releaseExtensionId = "hoblepbiofcahbbaobbfhhfhiihdekan";
const installerPath = join(import.meta.dir, "../install-release.sh");
const manifestPath = join(import.meta.dir, "../manifest.json");
const packagePath = join(import.meta.dir, "../package.json");

function extensionIdFromManifestKey(key: string): string {
  const digest = createHash("sha256").update(Buffer.from(key, "base64")).digest().subarray(0, 16);
  return Array.from(digest)
    .map(byte => String.fromCharCode(97 + (byte >> 4)) + String.fromCharCode(97 + (byte & 15)))
    .join("");
}

describe("release extension installer", () => {
  test("manifest key derives the documented release extension ID", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { key: string };

    expect(manifest.key).toBeTruthy();
    expect(extensionIdFromManifestKey(manifest.key)).toBe(releaseExtensionId);
  });

  test("package script writes the GitHub Release extension zip", () => {
    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as { scripts: Record<string, string> };

    expect(pkg.scripts.package).toContain("clipmark-extension.zip");
    expect(pkg.scripts.package).not.toContain("plannotator-clipboard-extension.zip");
  });

  test("installer verifies checksum and keeps release pin options", () => {
    const source = readFileSync(installerPath, "utf8");

    expect(source).toContain("RELEASE_EXTENSION_ID");
    expect(source).toContain("PLANNOTATOR_CHROME_EXTENSION_DIR");
    expect(source).toContain("clipmark-extension.zip.sha256");
    expect(source).toContain("PLANNOTATOR_CHROME_BASE_URL");
    expect(source).toContain("--version");
    expect(source).toContain("--repo");
    expect(source).toContain("https://github.com/$REPO/releases/download/$VERSION");
    expect(source).toContain("https://github.com/$REPO/releases/latest/download");
  });
});
