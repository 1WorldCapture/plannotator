import { describe, expect, test } from "bun:test";
import { MAX_CLIPBOARD_TEXT_CHARS, createClipboardPayload, shouldCopyFeedback } from "./types";

describe("clipboard payload state", () => {
  test("rejects empty clipboard text", () => {
    expect(createClipboardPayload("  ")).toEqual({ ok: false, reason: "empty", error: "Clipboard is empty." });
  });

  test("rejects oversized clipboard text", () => {
    const preview = createClipboardPayload("x".repeat(MAX_CLIPBOARD_TEXT_CHARS + 1));
    expect(preview.ok).toBe(false);
    if (!preview.ok) expect(preview.error).toContain("too large");
  });

  test("creates a payload for valid text", () => {
    const payload = createClipboardPayload("hello");
    expect(payload).toEqual({ ok: true, text: "hello", count: 5 });
  });
});

describe("feedback copy decisions", () => {
  test("copies only non-empty feedback responses", () => {
    expect(shouldCopyFeedback({ ok: true, type: "feedback", feedback: "notes" })).toBe(true);
    expect(shouldCopyFeedback({ ok: true, type: "feedback", feedback: "  " })).toBe(false);
    expect(shouldCopyFeedback({ ok: true, type: "no-feedback", decision: "dismissed" })).toBe(false);
    expect(shouldCopyFeedback({ ok: false, type: "error", error: "x" })).toBe(false);
  });
});
