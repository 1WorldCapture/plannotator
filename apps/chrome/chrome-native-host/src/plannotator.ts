import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { AnnotateClipboardRequest, NativeHostFinalMessage } from "./request";

export interface RunPlannotatorOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  readyFile?: string;
  readyTimeoutMs?: number;
  requireReady?: boolean;
  onReady?: (url: string) => void | Promise<void>;
  lookupInstalledCommand?: boolean;
  clipboardWriter?: (text: string) => void | Promise<void>;
  copyFeedbackToClipboard?: boolean;
}

type ClipboardDecision =
  | { decision: "annotated"; feedback: string }
  | { decision: "approved" }
  | { decision: "dismissed" };

const DEFAULT_READY_TIMEOUT_MS = 15_000;
const PLANNOTATOR_INSTALL_MESSAGE = "Plannotator CLI is not installed. Install it first: curl -fsSL https://plannotator.ai/install.sh | bash";
const DEBUG_LOG_PATH = process.env.PLANNOTATOR_CHROME_HOST_LOG || join(homedir(), ".plannotator", "chrome-native-host.log");

function debugLog(message: string): void {
  try {
    mkdirSync(dirname(DEBUG_LOG_PATH), { recursive: true });
    appendFileSync(DEBUG_LOG_PATH, `${new Date().toISOString()} ${message}\n`);
  } catch {
    // Logging must never interfere with Native Messaging stdout.
  }
}

export function parseClipboardDecision(raw: string): ClipboardDecision | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ClipboardDecision>;
    if (parsed.decision === "approved") return { decision: "approved" };
    if (parsed.decision === "dismissed") return { decision: "dismissed" };
    if (parsed.decision === "annotated") {
      return {
        decision: "annotated",
        feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function parseClipboardDecisionOutput(raw: string): ClipboardDecision | null {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index--) {
    const decision = parseClipboardDecision(lines[index]);
    if (decision) return decision;
  }
  return null;
}

function findExecutableOnPath(command: string): string | null {
  const pathValue = process.env.PATH || "";
  for (const dir of pathValue.split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, command);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function writeProcessStdin(command: string, args: string[], text: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
    child.stdin.on("error", reject);
    child.stdin.end(text);
  });
}

export async function writeSystemClipboard(text: string): Promise<void> {
  if (process.platform === "darwin") {
    const pbcopy = existsSync("/usr/bin/pbcopy") ? "/usr/bin/pbcopy" : "pbcopy";
    await writeProcessStdin(pbcopy, [], text);
    return;
  }

  if (process.platform === "linux") {
    const candidates: Array<{ command: string; args: string[] }> = [
      { command: "wl-copy", args: [] },
      { command: "xclip", args: ["-selection", "clipboard"] },
      { command: "xsel", args: ["--clipboard", "--input"] },
    ];
    for (const candidate of candidates) {
      const commandPath = findExecutableOnPath(candidate.command);
      if (!commandPath) continue;
      await writeProcessStdin(commandPath, candidate.args, text);
      return;
    }
    throw new Error("No supported clipboard command found. Install wl-copy, xclip, or xsel.");
  }

  throw new Error(`Clipboard copy is not supported on ${process.platform}.`);
}

export function resolvePlannotatorCommand(options: RunPlannotatorOptions = {}): { command: string; args: string[] } | null {
  if (options.command) {
    return { command: options.command, args: options.args || ["annotate-last", "--stdin", "--gate", "--json"] };
  }
  if (options.lookupInstalledCommand === false) return null;

  const installedCandidates = [
    process.env.PLANNOTATOR_BIN,
    `${homedir()}/.local/bin/plannotator`,
    "/opt/homebrew/bin/plannotator",
    "/usr/local/bin/plannotator",
  ].filter((candidate): candidate is string => !!candidate);
  const installed = installedCandidates.find(candidate => existsSync(candidate));
  if (installed) {
    return {
      command: installed,
      args: options.args || ["annotate-last", "--stdin", "--gate", "--json"],
    };
  }

  const pathInstalled = findExecutableOnPath("plannotator");
  if (!pathInstalled) return null;

  return {
    command: pathInstalled,
    args: options.args || ["annotate-last", "--stdin", "--gate", "--json"],
  };
}

function readReadyUrl(readyFile: string): string | null {
  if (!existsSync(readyFile)) return null;

  const lines = readFileSync(readyFile, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const payload = JSON.parse(line) as { url?: unknown };
      if (typeof payload.url === "string" && payload.url.trim()) {
        return payload.url;
      }
    } catch {
      // Keep polling; the server may still be appending a JSON line.
    }
  }
  return null;
}

async function waitForReadyUrl(
  readyFile: string,
  isExited: () => boolean,
  timeoutMs = DEFAULT_READY_TIMEOUT_MS,
): Promise<{ status: "ready"; url: string } | { status: "exited" | "timeout" }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = readReadyUrl(readyFile);
    if (url) return { status: "ready", url };
    if (isExited()) return { status: "exited" };
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return { status: "timeout" };
}

export async function runClipboardAnnotation(
  request: AnnotateClipboardRequest,
  options: RunPlannotatorOptions = {},
): Promise<NativeHostFinalMessage> {
  debugLog(`request received type=${request.type} textLength=${request.text.length}`);
  const resolved = resolvePlannotatorCommand(options);
  if (!resolved) {
    debugLog("plannotator command not found");
    return {
      ok: false,
      type: "error",
      error: PLANNOTATOR_INSTALL_MESSAGE,
    };
  }
  const { command, args } = resolved;
  debugLog(`resolved plannotator command=${command} args=${args.join(" ")}`);
  const requireReady = options.requireReady ?? true;
  const readyFile = requireReady
    ? options.readyFile ?? join(tmpdir(), `plannotator-chrome-${process.pid}-${Date.now()}-${randomUUID()}.jsonl`)
    : null;

  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(command, args, {
      cwd: options.cwd,
      env: readyFile
        ? {
            ...process.env,
            PLANNOTATOR_ORIGIN: "chrome-extension",
            PLANNOTATOR_READY_FILE: readyFile,
            PLANNOTATOR_SKIP_BROWSER_OPEN: "1",
          }
        : process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    return {
      ok: false,
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let stdout = "";
  let stderr = "";
  let exited = false;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  child.stdin.on("error", () => {});
  child.stdin.end(request.text);

  const exitCodePromise = new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", code => {
      exited = true;
      resolve(code);
    });
  });

  try {
    if (readyFile) {
      const ready = await waitForReadyUrl(
        readyFile,
        () => exited,
        options.readyTimeoutMs,
      );
      if (ready.status === "timeout") {
        child.kill();
        debugLog("ready timeout");
        return {
          ok: false,
          type: "error",
          error: "Timed out waiting for Plannotator to publish its browser URL.",
        };
      }
      if (ready.status === "exited") {
        await exitCodePromise.catch(() => null);
        debugLog(`exited before ready stderrLength=${stderr.trim().length}`);
        return {
          ok: false,
          type: "error",
          error: stderr.trim() || "Plannotator exited before publishing its browser URL.",
        };
      }
      await options.onReady?.(ready.url);
      debugLog(`ready url published url=${ready.url}`);
    }

    const exitCode = await exitCodePromise;
    debugLog(`plannotator exited code=${exitCode ?? "unknown"} stdoutLength=${stdout.length} stderrLength=${stderr.length}`);

    if (exitCode !== 0) {
      return {
        ok: false,
        type: "error",
        error: stderr.trim() || `Plannotator exited with code ${exitCode ?? "unknown"}`,
      };
    }

    const decision = parseClipboardDecisionOutput(stdout);
    if (!decision) {
      const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
      debugLog(`clipboard decision missing lines=${lines.length}`);
      return {
        ok: false,
        type: "error",
        error: "Plannotator did not return a clipboard decision",
      };
    }

    if (decision.decision === "annotated" && decision.feedback.trim()) {
      debugLog(`clipboard decision annotated feedbackLength=${decision.feedback.length}`);
      if (options.copyFeedbackToClipboard !== false) {
        try {
          await (options.clipboardWriter || writeSystemClipboard)(decision.feedback);
          debugLog("feedback copied to system clipboard");
        } catch {
          debugLog("feedback system clipboard copy failed");
          // The extension still receives feedback and may copy it if its popup is alive.
        }
      }
      return {
        ok: true,
        type: "feedback",
        feedback: decision.feedback,
      };
    }

    if (decision.decision === "approved") {
      debugLog("clipboard decision approved");
      return {
        ok: true,
        type: "no-feedback",
        decision: "approved",
      };
    }

    debugLog("clipboard decision dismissed");
    return {
      ok: true,
      type: "no-feedback",
      decision: "dismissed",
    };
  } catch (err) {
    return {
      ok: false,
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (readyFile) {
      try {
        unlinkSync(readyFile);
      } catch {
        // Temporary file may not exist if the child exits before startup.
      }
    }
  }
}
