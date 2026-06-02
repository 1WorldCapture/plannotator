import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseClipboardDecision, resolvePlannotatorCommand, runClipboardAnnotation } from "./plannotator";

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

  test("parses plannotator annotate-last json decisions", () => {
    expect(parseClipboardDecision('{"decision":"annotated","feedback":"notes"}')).toEqual({
      decision: "annotated",
      feedback: "notes",
    });
    expect(parseClipboardDecision('{"decision":"approved"}')).toEqual({ decision: "approved" });
    expect(parseClipboardDecision('{"decision":"dismissed"}')).toEqual({ decision: "dismissed" });
    expect(parseClipboardDecision("not json")).toBeNull();
  });

  test("returns submitted feedback", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
printf '%s\\n' '{"decision":"annotated","feedback":"notes"}'
`);

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [] },
    )).resolves.toEqual({ ok: true, status: "feedback", feedback: "notes" });
  });

  test("returns no-feedback status for approved sessions", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
cat >/dev/null
printf '%s\\n' '{"decision":"approved"}'
`);

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [] },
    )).resolves.toEqual({ ok: true, status: "no-feedback", decision: "approved" });
  });

  test("returns errors from failed plannotator command", async () => {
    const command = fakeCommand(`#!/usr/bin/env sh
echo failed >&2
exit 2
`);

    await expect(runClipboardAnnotation(
      { type: "annotateClipboard", text: "message" },
      { command, args: [] },
    )).resolves.toEqual({ ok: false, error: "failed" });
  });
});
