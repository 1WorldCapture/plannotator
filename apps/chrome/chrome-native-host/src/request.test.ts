import { describe, expect, test } from "bun:test";
import { MAX_CLIPBOARD_TEXT_CHARS, validateAnnotateClipboardRequest } from "./request";

describe("annotateClipboard request validation", () => {
  test("accepts valid clipboard annotation requests", () => {
    expect(validateAnnotateClipboardRequest({
      type: "annotateClipboard",
      text: "message",
      source: { kind: "clipboard", pageUrl: "https://gemini.google.com/", title: "Gemini" },
    })).toEqual({
      type: "annotateClipboard",
      text: "message",
      source: { kind: "clipboard", pageUrl: "https://gemini.google.com/", title: "Gemini" },
    });
  });

  test("rejects unsupported type and empty text", () => {
    expect(() => validateAnnotateClipboardRequest({ type: "other", text: "x" })).toThrow("Unsupported request type");
    expect(() => validateAnnotateClipboardRequest({ type: "annotateClipboard", text: "  " })).toThrow("empty");
  });

  test("rejects oversized text", () => {
    expect(() => validateAnnotateClipboardRequest({
      type: "annotateClipboard",
      text: "x".repeat(MAX_CLIPBOARD_TEXT_CHARS + 1),
    })).toThrow("exceeds");
  });
});
