import { describe, expect, test } from "bun:test";
import { shouldRunNativeHost } from "./host";

describe("native host entrypoint detection", () => {
  test("runs when Bun marks the module as main", () => {
    expect(shouldRunNativeHost(["bun", "test"], true)).toBe(true);
  });

  test("runs compiled native-host binaries installed without an architecture suffix", () => {
    expect(shouldRunNativeHost(["/Users/me/.local/share/plannotator/chrome-native-host/plannotator-chrome-native-host"], false)).toBe(true);
  });

  test("runs release artifact binaries before installer renaming", () => {
    expect(shouldRunNativeHost(["/tmp/plannotator-chrome-native-host-darwin-arm64"], false)).toBe(true);
    expect(shouldRunNativeHost(["/tmp/plannotator-chrome-native-host-linux-x64"], false)).toBe(true);
  });

  test("runs source launchers", () => {
    expect(shouldRunNativeHost(["bun", "/repo/apps/chrome/chrome-native-host/src/host.ts"], false)).toBe(true);
  });

  test("does not run when imported by tests", () => {
    expect(shouldRunNativeHost(["bun", "/repo/apps/chrome/chrome-native-host/src/host.test.ts"], false)).toBe(false);
  });
});
