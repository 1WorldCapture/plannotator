import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
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
}

type ClipboardDecision =
  | { decision: "annotated"; feedback: string }
  | { decision: "approved" }
  | { decision: "dismissed" };

const DEFAULT_READY_TIMEOUT_MS = 15_000;

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

export function resolvePlannotatorCommand(options: RunPlannotatorOptions = {}): { command: string; args: string[] } {
  if (options.command) {
    return { command: options.command, args: options.args || ["annotate-last", "--stdin", "--gate", "--json"] };
  }

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

  return {
    command: "plannotator",
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
  const { command, args } = resolvePlannotatorCommand(options);
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
        return {
          ok: false,
          type: "error",
          error: "Timed out waiting for Plannotator to publish its browser URL.",
        };
      }
      if (ready.status === "exited") {
        await exitCodePromise.catch(() => null);
        return {
          ok: false,
          type: "error",
          error: stderr.trim() || "Plannotator exited before publishing its browser URL.",
        };
      }
      await options.onReady?.(ready.url);
    }

    const exitCode = await exitCodePromise;

    if (exitCode !== 0) {
      return {
        ok: false,
        type: "error",
        error: stderr.trim() || `Plannotator exited with code ${exitCode ?? "unknown"}`,
      };
    }

    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    const decision = parseClipboardDecision(lines[lines.length - 1] || "");
    if (!decision) {
      return {
        ok: false,
        type: "error",
        error: "Plannotator did not return a clipboard decision",
      };
    }

    if (decision.decision === "annotated" && decision.feedback.trim()) {
      return {
        ok: true,
        type: "feedback",
        feedback: decision.feedback,
      };
    }

    if (decision.decision === "approved") {
      return {
        ok: true,
        type: "no-feedback",
        decision: "approved",
      };
    }

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
