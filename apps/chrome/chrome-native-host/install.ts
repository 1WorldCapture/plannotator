import { existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const HOST_NAME = "ai.plannotator.clipboard";
const EXTENSION_ID_RE = /^[a-p]{32}$/;

type BrowserTarget =
  | "chrome"
  | "chrome-for-testing"
  | "chromium"
  | "arc"
  | "edge"
  | "brave"
  | "vivaldi"
  | "tge"
  | "all";

function usage(): never {
  console.error("Usage: bun apps/chrome/chrome-native-host/install.ts --extension-id <chrome-extension-id> [--browser chrome|chrome-for-testing|chromium|arc|edge|brave|vivaldi|tge|all]");
  process.exit(1);
}

function getArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function targetDirs(browser: BrowserTarget): string[] {
  if (process.platform === "darwin") {
    const base = path.join(homedir(), "Library/Application Support");
    const tgeCache = path.join(base, "TgeBrowser/browser-cache");
    const tgeDirs = existsSync(tgeCache)
      ? readdirSync(tgeCache)
        .filter(entry => entry.startsWith("chrome_"))
        .map(entry => path.join(tgeCache, entry, "NativeMessagingHosts"))
      : [];
    const targets: Record<Exclude<BrowserTarget, "all">, string[]> = {
      chrome: [path.join(base, "Google/Chrome/NativeMessagingHosts")],
      "chrome-for-testing": [
        path.join(base, "Google/Chrome for Testing/NativeMessagingHosts"),
        path.join(base, "Google/ChromeForTesting/NativeMessagingHosts"),
      ],
      chromium: [path.join(base, "Chromium/NativeMessagingHosts")],
      arc: [path.join(base, "Arc/User Data/NativeMessagingHosts")],
      edge: [path.join(base, "Microsoft Edge/NativeMessagingHosts")],
      brave: [path.join(base, "BraveSoftware/Brave-Browser/NativeMessagingHosts")],
      vivaldi: [path.join(base, "Vivaldi/NativeMessagingHosts")],
      tge: tgeDirs,
    };
    if (browser === "all") return Object.values(targets).flat();
    return targets[browser];
  }
  if (process.platform === "linux") {
    const base = path.join(homedir(), ".config");
    const targets: Record<Exclude<BrowserTarget, "all">, string[]> = {
      chrome: [path.join(base, "google-chrome/NativeMessagingHosts")],
      "chrome-for-testing": [path.join(base, "google-chrome-for-testing/NativeMessagingHosts")],
      chromium: [path.join(base, "chromium/NativeMessagingHosts")],
      arc: [path.join(base, "arc/NativeMessagingHosts")],
      edge: [path.join(base, "microsoft-edge/NativeMessagingHosts")],
      brave: [path.join(base, "BraveSoftware/Brave-Browser/NativeMessagingHosts")],
      vivaldi: [path.join(base, "vivaldi/NativeMessagingHosts")],
      tge: [path.join(base, "TgeBrowser/NativeMessagingHosts")],
    };
    if (browser === "all") return Object.values(targets).flat();
    return targets[browser];
  }
  throw new Error("Native host installer currently supports macOS and Linux. On Windows, register the manifest path in the Chrome Native Messaging registry key.");
}

const extensionId = getArg("--extension-id");
if (!extensionId) usage();
if (!EXTENSION_ID_RE.test(extensionId)) {
  console.error("Invalid Chrome extension ID. Expected 32 lowercase letters from a-p.");
  process.exit(1);
}
const browser = (getArg("--browser") || "chrome") as BrowserTarget;
const validBrowsers = new Set<BrowserTarget>(["chrome", "chrome-for-testing", "chromium", "arc", "edge", "brave", "vivaldi", "tge", "all"]);
if (!validBrowsers.has(browser)) usage();

const hostDir = import.meta.dir;
const compiledHostPath = path.join(hostDir, "dist/plannotator-chrome-native-host");
const sourceHostPath = path.join(hostDir, "bin/plannotator-chrome-native-host");
const hostPath = existsSync(compiledHostPath) ? compiledHostPath : sourceHostPath;
if (!existsSync(hostPath)) {
  throw new Error(`Native host launcher not found: ${hostPath}`);
}

const template = await Bun.file(path.join(hostDir, "manifest.template.json")).text();
const manifest = template
  .replace("__HOST_PATH__", hostPath)
  .replace("__EXTENSION_ID__", extensionId);

for (const outputDir of targetDirs(browser)) {
  await Bun.$`mkdir -p ${outputDir}`;
  const outputPath = path.join(outputDir, `${HOST_NAME}.json`);
  await Bun.write(outputPath, manifest);

  console.log(`Installed ${HOST_NAME} native host manifest: ${outputPath}`);
}
