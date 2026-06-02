import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { AnnotateClipboardRequest, NativeHostResponse } from "./request";

export interface RunPlannotatorOptions {
  command?: string;
  args?: string[];
  cwd?: string;
}

type ClipboardDecision =
  | { decision: "annotated"; feedback: string }
  | { decision: "approved" }
  | { decision: "dismissed" };

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

export async function runClipboardAnnotation(
  request: AnnotateClipboardRequest,
  options: RunPlannotatorOptions = {},
): Promise<NativeHostResponse> {
  const { command, args } = resolvePlannotatorCommand(options);

  const child = spawn(command, args, {
    cwd: options.cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  child.stdin.end(request.text);

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  if (exitCode !== 0) {
    return {
      ok: false,
      error: stderr.trim() || `Plannotator exited with code ${exitCode ?? "unknown"}`,
    };
  }

  const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
  const decision = parseClipboardDecision(lines[lines.length - 1] || "");
  if (!decision) {
    return {
      ok: false,
      error: "Plannotator did not return a clipboard decision",
    };
  }

  if (decision.decision === "annotated" && decision.feedback.trim()) {
    return {
      ok: true,
      status: "feedback",
      feedback: decision.feedback,
    };
  }

  if (decision.decision === "approved") {
    return {
      ok: true,
      status: "no-feedback",
      decision: "approved",
    };
  }

  return {
    ok: true,
    status: "no-feedback",
    decision: "dismissed",
  };
}
