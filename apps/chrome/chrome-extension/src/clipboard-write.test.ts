import { afterEach, describe, expect, test } from "bun:test";
import { copyTextToClipboard, isClipboardWriteMessage } from "./clipboard-write";

afterEach(() => {
  delete (globalThis as { chrome?: unknown }).chrome;
});

function installChromeMock(options: {
  hasDocument?: boolean;
  createError?: string;
  response?: unknown;
  runtimeError?: string;
} = {}) {
  const createdDocuments: unknown[] = [];
  const sentMessages: unknown[] = [];

  (globalThis as any).chrome = {
    runtime: {
      lastError: undefined,
      getURL: (path: string) => `chrome-extension://id/${path}`,
      sendMessage: (message: unknown, callback?: (response?: unknown) => void) => {
        sentMessages.push(message);
        if (options.runtimeError) {
          (globalThis as any).chrome.runtime.lastError = { message: options.runtimeError };
        }
        callback?.(options.response ?? { ok: true });
        (globalThis as any).chrome.runtime.lastError = undefined;
      },
    },
    offscreen: {
      hasDocument: async () => options.hasDocument ?? false,
      createDocument: async (documentOptions: unknown) => {
        createdDocuments.push(documentOptions);
        if (options.createError) throw new Error(options.createError);
      },
    },
  };

  return { createdDocuments, sentMessages };
}

describe("clipboard feedback writer", () => {
  test("recognizes clipboard write messages", () => {
    expect(isClipboardWriteMessage({ type: "copyTextToClipboard", text: "notes" })).toBe(true);
    expect(isClipboardWriteMessage({ type: "copyTextToClipboard", text: "" })).toBe(true);
    expect(isClipboardWriteMessage({ type: "copyTextToClipboard" })).toBe(false);
    expect(isClipboardWriteMessage({ type: "other", text: "notes" })).toBe(false);
  });

  test("creates an offscreen document and sends non-empty feedback", async () => {
    const chromeMock = installChromeMock();

    await expect(copyTextToClipboard("notes")).resolves.toBeUndefined();

    expect(chromeMock.createdDocuments).toEqual([{
      url: "offscreen.html",
      reasons: ["CLIPBOARD"],
      justification: "Copy submitted Plannotator annotation feedback to the clipboard.",
    }]);
    expect(chromeMock.sentMessages).toEqual([{ type: "copyTextToClipboard", text: "notes" }]);
  });

  test("reuses an existing offscreen document", async () => {
    const chromeMock = installChromeMock({ hasDocument: true });

    await expect(copyTextToClipboard("notes")).resolves.toBeUndefined();

    expect(chromeMock.createdDocuments).toEqual([]);
    expect(chromeMock.sentMessages).toEqual([{ type: "copyTextToClipboard", text: "notes" }]);
  });

  test("ignores empty feedback", async () => {
    const chromeMock = installChromeMock();

    await expect(copyTextToClipboard("  ")).resolves.toBeUndefined();

    expect(chromeMock.createdDocuments).toEqual([]);
    expect(chromeMock.sentMessages).toEqual([]);
  });

  test("tolerates an already-created offscreen document race", async () => {
    const chromeMock = installChromeMock({ createError: "Only a single offscreen document may be created." });

    await expect(copyTextToClipboard("notes")).resolves.toBeUndefined();

    expect(chromeMock.sentMessages).toEqual([{ type: "copyTextToClipboard", text: "notes" }]);
  });

  test("reports missing offscreen support", async () => {
    installChromeMock();
    delete (globalThis as any).chrome.offscreen;

    await expect(copyTextToClipboard("notes")).rejects.toThrow("Chrome offscreen documents are unavailable");
  });

  test("reports clipboard write failures", async () => {
    installChromeMock({ response: { ok: false, error: "copy failed" } });

    await expect(copyTextToClipboard("notes")).rejects.toThrow("copy failed");
  });

  test("reports runtime sendMessage failures", async () => {
    installChromeMock({ runtimeError: "Receiving end does not exist." });

    await expect(copyTextToClipboard("notes")).rejects.toThrow("Receiving end does not exist.");
  });
});
