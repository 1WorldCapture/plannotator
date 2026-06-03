import { afterEach, describe, expect, test } from "bun:test";
import {
  registerOffscreenClipboardWriter,
  writeClipboardTextInOffscreenDocument,
  writeClipboardWithExecCommand,
} from "./offscreen";

const originalDocument = (globalThis as { document?: unknown }).document;
const originalNavigator = (globalThis as { navigator?: unknown }).navigator;

function restoreGlobals(): void {
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
  delete (globalThis as { chrome?: unknown }).chrome;
}

afterEach(() => {
  restoreGlobals();
});

function installDocumentMock(options: { execCommand?: (command: string) => boolean } = {}) {
  const appended: unknown[] = [];
  const textarea = {
    id: "clipboard-text",
    value: "",
    style: {},
    setAttribute: () => {},
    focus: () => {},
    select: () => {},
    remove: () => {
      appended.pop();
    },
  } as unknown as HTMLTextAreaElement;

  const doc = {
    body: {
      appendChild: (node: unknown) => appended.push(node),
    },
    getElementById: () => null,
    createElement: () => textarea,
    execCommand: options.execCommand ?? (() => true),
  } as unknown as Document;

  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  return { doc, textarea, appended };
}

describe("offscreen clipboard writer", () => {
  test("copies text with the offscreen document execCommand path", () => {
    const copiedCommands: string[] = [];
    const { doc, textarea, appended } = installDocumentMock({
      execCommand: command => {
        copiedCommands.push(command);
        return true;
      },
    });

    writeClipboardWithExecCommand("notes", doc);

    expect(copiedCommands).toEqual(["copy"]);
    expect(textarea.value).toBe("");
    expect(appended).toEqual([]);
  });

  test("falls back to navigator.clipboard when execCommand fails", async () => {
    installDocumentMock({ execCommand: () => false });
    const copied: string[] = [];
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          writeText: async (text: string) => {
            copied.push(text);
          },
        },
      },
    });

    await expect(writeClipboardTextInOffscreenDocument("notes")).resolves.toBeUndefined();
    expect(copied).toEqual(["notes"]);
  });

  test("surfaces both clipboard copy errors when both methods fail", async () => {
    installDocumentMock({ execCommand: () => false });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          writeText: async () => {
            throw new Error("Document is not focused.");
          },
        },
      },
    });

    await expect(writeClipboardTextInOffscreenDocument("notes"))
      .rejects.toThrow("Document is not focused.");
  });

  test("registers a runtime message handler that acknowledges successful copies", async () => {
    const listeners: Array<(message: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => boolean | void> = [];
    const responses: unknown[] = [];
    installDocumentMock();
    (globalThis as any).chrome = {
      runtime: {
        onMessage: {
          addListener: (listener: typeof listeners[number]) => listeners.push(listener),
        },
      },
    };

    registerOffscreenClipboardWriter();
    const keepAlive = listeners[0]?.(
      { type: "copyTextToClipboard", text: "notes" },
      {},
      response => responses.push(response),
    );
    await Promise.resolve();

    expect(keepAlive).toBe(true);
    expect(responses).toEqual([{ ok: true }]);
  });
});
