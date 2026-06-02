import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const scriptPath = join(import.meta.dir, "../../install-release.sh");

describe("combined Chrome release installer", () => {
  test("downloads and verifies extension and native-host installers", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain("fetch_installer install-chrome-extension.sh");
    expect(source).toContain("fetch_installer install-chrome-native-host.sh");
    expect(source).toContain("download \"$BASE_URL/$name.sha256\"");
    expect(source).toContain("verify_checksum \"$installer_path\" \"$installer_path.sha256\"");
  });

  test("preserves release pinning and native-host options", () => {
    const source = readFileSync(scriptPath, "utf8");

    expect(source).toContain("--version");
    expect(source).toContain("PLANNOTATOR_CHROME_BASE_URL");
    expect(source).toContain("--repo");
    expect(source).toContain("--browser");
    expect(source).toContain("--extension-id");
    expect(source).toContain("sh \"$TMP_DIR/install-chrome-extension.sh\" \"$@\"");
    expect(source).toContain("sh \"$TMP_DIR/install-chrome-native-host.sh\" \"$@\"");
  });
});
