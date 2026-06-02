import { afterEach, describe, expect, test } from "bun:test";
import { readClipboardText } from "./clipboard";

const originalWindow = (globalThis as { window?: unknown }).window;
const originalDocument = (globalThis as { document?: unknown }).document;
const originalNavigator = (globalThis as { navigator?: unknown }).navigator;

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: originalDocument,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: originalNavigator,
  });
});

function installClipboardMock(options: {
  readText: () => Promise<string>;
  execCommand?: (command: string) => boolean;
  pastedText?: string;
}) {
  const appended: unknown[] = [];
  const textarea = {
    value: options.pastedText ?? "",
    style: {},
    setAttribute: () => {},
    focus: () => {},
    select: () => {},
    remove: () => {
      appended.pop();
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { focus: () => {} },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body: {
        appendChild: (node: unknown) => {
          appended.push(node);
        },
        focus: () => {},
      },
      createElement: () => textarea,
      execCommand: options.execCommand ?? (() => false),
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        readText: options.readText,
      },
    },
  });

  return { appended };
}

describe("readClipboardText", () => {
  test("reads with the Clipboard API when the popup document is focused", async () => {
    installClipboardMock({
      readText: async () => "from clipboard api",
    });

    await expect(readClipboardText()).resolves.toBe("from clipboard api");
  });

  test("falls back to paste command when Clipboard API reports an unfocused document", async () => {
    const mock = installClipboardMock({
      readText: async () => {
        throw new Error("Failed to execute 'readText' on 'Clipboard': Document is not focused.");
      },
      execCommand: command => command === "paste",
      pastedText: "from paste fallback",
    });

    await expect(readClipboardText()).resolves.toBe("from paste fallback");
    expect(mock.appended).toHaveLength(0);
  });

  test("preserves the Clipboard API error when fallback cannot paste", async () => {
    installClipboardMock({
      readText: async () => {
        throw new Error("Document is not focused.");
      },
      execCommand: () => false,
      pastedText: "",
    });

    await expect(readClipboardText()).rejects.toThrow("Document is not focused.");
  });
});
