import { describe, expect, test } from "bun:test";
import { normalizeNativeResponse } from "./native";

describe("Native Messaging response normalization", () => {
  test("accepts feedback responses", () => {
    expect(normalizeNativeResponse({ ok: true, status: "feedback", feedback: "notes" })).toEqual({
      ok: true,
      status: "feedback",
      feedback: "notes",
    });
  });

  test("accepts no-feedback responses", () => {
    expect(normalizeNativeResponse({ ok: true, status: "no-feedback", decision: "approved" })).toEqual({
      ok: true,
      status: "no-feedback",
      decision: "approved",
    });
  });

  test("normalizes invalid and error responses", () => {
    expect(normalizeNativeResponse(undefined)).toEqual({
      ok: false,
      error: "Native host returned an invalid response.",
    });
    expect(normalizeNativeResponse({ ok: false, error: "failed" })).toEqual({
      ok: false,
      error: "failed",
    });
  });
});
