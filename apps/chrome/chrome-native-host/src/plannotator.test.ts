import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseClipboardDecision, parseClipboardDecisionOutput, resolvePlannotatorCommand, runClipboardAnnotation } from "./plannotator";

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

function fakeCommand(script: string): string {
  const dir = mkdtempSync(join(tmpdir(), "plannotator-host-test-"));
  tempDirs.push(dir);
  const file = join(dir, "fake.sh");
  writeFileSync(file, script, "utf8");
  chmodSync(file, 0o755);
  return file;
}

describe("runClipboardAnnotation", () => {
  test("uses annotate-last json mode for installed plannotator binaries", () => {
    const previousBun = process.env.BUN_BIN;
    const previousBin = process.env.PLANNOTATOR_BIN;
    const command = fakeCommand(`#!/usr/bin/env sh
exit 0
`);
    delete process.env.BUN_BIN;
    process.env.PLANNOTATOR_BIN = command;

    expect(existsSync(command)).toBe(true);
    expect(resolvePlannotatorCommand()).toEqual({
      command,
      args: ["annotate-last", "--stdin", "--gate", "--json"],
    });

    if (previousBun === undefined) delete process.env.BUN_BIN;
    else process.env.BUN_BIN = previousBun;
    if (previousBin === undefined) delete process.env.PLANNOTATOR_BIN;
    else process.env.PLANNOTATOR_BIN = previousBin;
  });

  test("reports install guidance when plannotator CLI is unavailable", async () => {
    expect(resolvePlannotatorCommand({ lookupInstalledCommand: false })).toBeNull();

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { lookupInstalledCommand: false },
    )).resolves.toEqual({
      ok: false,
      type: "error",
      error: "Plannotator CLI is not installed. Install it first: curl -fsSL https://plannotator.ai/install.sh | bash",
    });
  });

  test("parses plannotator annotate-last json decisions", () => {
    expect(parseClipboardDecision('{"decision":"annotated","feedback":"notes"}')).toEqual({
      decision: "annotated",
      feedback: "notes",
    });
    expect(parseClipboardDecision('{"decision":"approved"}')).toEqual({ decision: "approved" });
    expect(parseClipboardDecision('{"decision":"dismissed"}')).toEqual({ decision: "dismissed" });
    expect(parseClipboardDecision("not json")).toBeNull();
  });

  test("finds the final annotate-last json decision even when stdout has logs after it", () => {
    expect(parseClipboardDecisionOutput([
      "starting plannotator",
      '{"decision":"annotated","feedback":"notes"}',
      "cleanup complete",
    ].join("\n"))).toEqual({
      decision: "annotated",
      feedback: "notes",
    });
  });

  test("returns submitted feedback", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
printf '%s\\n' '{"url":"http://127.0.0.1:19432"}' > "$PLANNOTATOR_READY_FILE"
printf '%s\\n' '{"decision":"annotated","feedback":"notes"}'
`);
    const readyUrls: string[] = [];
    const copied: string[] = [];

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [], onReady: url => readyUrls.push(url), clipboardWriter: text => copied.push(text) },
    )).resolves.toEqual({ ok: true, type: "feedback", feedback: "notes" });
    expect(readyUrls).toEqual(["http://127.0.0.1:19432"]);
    expect(copied).toEqual(["notes"]);
  });

  test("returns submitted feedback when plannotator logs after the json decision", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
printf '%s\n' '{"url":"http://127.0.0.1:19432"}' > "$PLANNOTATOR_READY_FILE"
printf '%s\n' 'starting plannotator'
printf '%s\n' '{"decision":"annotated","feedback":"notes"}'
printf '%s\n' 'cleanup complete'
`);
    const copied: string[] = [];

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [], clipboardWriter: text => copied.push(text) },
    )).resolves.toEqual({ ok: true, type: "feedback", feedback: "notes" });
    expect(copied).toEqual(["notes"]);
  });

  test("still returns submitted feedback when native clipboard copy fails", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
printf '%s\\n' '{"url":"http://127.0.0.1:19432"}' > "$PLANNOTATOR_READY_FILE"
printf '%s\\n' '{"decision":"annotated","feedback":"notes"}'
`);

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      {
        command,
        args: [],
        clipboardWriter: () => {
          throw new Error("copy failed");
        },
      },
    )).resolves.toEqual({ ok: true, type: "feedback", feedback: "notes" });
  });

  test("returns no-feedback status for approved sessions", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
printf '%s\\n' '{"url":"http://127.0.0.1:19432"}' > "$PLANNOTATOR_READY_FILE"
printf '%s\\n' '{"decision":"approved"}'
`);

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [] },
    )).resolves.toEqual({ ok: true, type: "no-feedback", decision: "approved" });
  });

  test("passes ready-file browser suppression environment and removes the ready file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "plannotator-ready-test-"));
    tempDirs.push(dir);
    const readyFile = join(dir, "ready.jsonl");
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
if [ "$PLANNOTATOR_SKIP_BROWSER_OPEN" != "1" ]; then
  echo "skip flag missing" >&2
  exit 9
fi
if [ "$PLANNOTATOR_ORIGIN" != "chrome-extension" ]; then
  echo "origin missing" >&2
  exit 9
fi
printf '%s\\n' '{"url":"http://127.0.0.1:5678"}' > "$PLANNOTATOR_READY_FILE"
printf '%s\\n' '{"decision":"dismissed"}'
`);

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [], readyFile },
    )).resolves.toEqual({ ok: true, type: "no-feedback", decision: "dismissed" });
    expect(existsSync(readyFile)).toBe(false);
  });

  test("ignores malformed ready lines until a valid URL is published", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
printf '%s\\n' 'not-json' > "$PLANNOTATOR_READY_FILE"
printf '%s\\n' '{"url":"http://127.0.0.1:2468"}' >> "$PLANNOTATOR_READY_FILE"
printf '%s\\n' '{"decision":"approved"}'
`);
    const readyUrls: string[] = [];

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [], onReady: url => readyUrls.push(url) },
    )).resolves.toEqual({ ok: true, type: "no-feedback", decision: "approved" });
    expect(readyUrls).toEqual(["http://127.0.0.1:2468"]);
  });

  test("returns an error when plannotator exits before publishing a URL", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
printf '%s\\n' '{"decision":"approved"}'
`);

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [] },
    )).resolves.toEqual({
      ok: false,
      type: "error",
      error: "Plannotator exited before publishing its browser URL.",
    });
  });

  test("returns an error and cleans up when ready publication times out", async () => {
    const dir = mkdtempSync(join(tmpdir(), "plannotator-ready-timeout-"));
    tempDirs.push(dir);
    const readyFile = join(dir, "ready.jsonl");
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
sleep 1
`);

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [], readyFile, readyTimeoutMs: 25 },
    )).resolves.toEqual({
      ok: false,
      type: "error",
      error: "Timed out waiting for Plannotator to publish its browser URL.",
    });
    expect(existsSync(readyFile)).toBe(false);
  });

  test("returns errors from failed plannotator command", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
printf '%s\\n' '{"url":"http://127.0.0.1:19432"}' > "$PLANNOTATOR_READY_FILE"
echo failed >&2
exit 2
`);

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [] },
    )).resolves.toEqual({ ok: false, type: "error", error: "failed" });
  });
});
