import { describe, expect, test } from "bun:test";
import { decodeNativeMessage, encodeNativeMessage } from "./protocol";

describe("Native Messaging protocol", () => {
  test("encodes and decodes length-prefixed JSON", () => {
    const encoded = encodeNativeMessage({ ok: true, value: "hello" });
    expect(encoded.readUInt32LE(0)).toBe(encoded.length - 4);
    expect(decodeNativeMessage(encoded)).toEqual({ ok: true, value: "hello" });
  });

  test("rejects incomplete messages", () => {
    expect(() => decodeNativeMessage(Buffer.from([1, 0]))).toThrow("missing length header");

    const encoded = encodeNativeMessage({ ok: true });
    expect(() => decodeNativeMessage(encoded.subarray(0, encoded.length - 1))).toThrow("incomplete");
  });
});
