import { afterEach, describe, expect, test } from "bun:test";
import {
  getActiveTabContext,
  normalizeNativeMessage,
  normalizeNativeResponse,
  openAdjacentPlannotatorTab,
  sendNativeRequest,
} from "./native";

type MessageListener = (message: unknown) => void;
type DisconnectListener = () => void;

afterEach(() => {
  delete (globalThis as { chrome?: unknown }).chrome;
});

function installChromeMock(options: {
  tabs?: Array<{ url?: string; title?: string; windowId?: number; index?: number }>;
  tabCreateError?: string;
} = {}) {
  let messageListener: MessageListener | null = null;
  let disconnectListener: DisconnectListener | null = null;
  const postedMessages: unknown[] = [];
  const createdTabs: Array<{ url: string; active?: boolean; windowId?: number; index?: number }> = [];

  (globalThis as any).chrome = {
    runtime: {
      lastError: undefined,
      connectNative: () => ({
        postMessage: (message: unknown) => {
          postedMessages.push(message);
        },
        disconnect: () => {
          disconnectListener?.();
        },
        onMessage: {
          addListener: (callback: MessageListener) => {
            messageListener = callback;
          },
        },
        onDisconnect: {
          addListener: (callback: DisconnectListener) => {
            disconnectListener = callback;
          },
        },
      }),
    },
    tabs: {
      query: (_queryInfo: unknown, callback: (tabs: typeof options.tabs) => void) => {
        callback(options.tabs ?? []);
      },
      create: (
        createProperties: { url: string; active?: boolean; windowId?: number; index?: number },
        callback?: () => void,
      ) => {
        createdTabs.push(createProperties);
        if (options.tabCreateError) {
          (globalThis as any).chrome.runtime.lastError = { message: options.tabCreateError };
        }
        callback?.();
        (globalThis as any).chrome.runtime.lastError = undefined;
      },
    },
  };

  return {
    postedMessages,
    createdTabs,
    emitMessage: (message: unknown) => {
      if (!messageListener) throw new Error("No message listener registered");
      messageListener(message);
    },
    emitDisconnect: (error?: string) => {
      if (!disconnectListener) throw new Error("No disconnect listener registered");
      (globalThis as any).chrome.runtime.lastError = error ? { message: error } : undefined;
      disconnectListener();
      (globalThis as any).chrome.runtime.lastError = undefined;
    },
  };
}

describe("Native Messaging response normalization", () => {
  test("accepts ready responses", () => {
    expect(normalizeNativeMessage({ ok: true, type: "ready", url: "http://127.0.0.1:1234" })).toEqual({
      ok: true,
      type: "ready",
      url: "http://127.0.0.1:1234",
    });
  });

  test("accepts feedback responses", () => {
    expect(normalizeNativeResponse({ ok: true, type: "feedback", feedback: "notes" })).toEqual({
      ok: true,
      type: "feedback",
      feedback: "notes",
    });
  });

  test("accepts no-feedback responses", () => {
    expect(normalizeNativeResponse({ ok: true, type: "no-feedback", decision: "approved" })).toEqual({
      ok: true,
      type: "no-feedback",
      decision: "approved",
    });
  });

  test("normalizes invalid and error responses", () => {
    expect(normalizeNativeResponse(undefined)).toEqual({
      ok: false,
      type: "error",
      error: "Native host returned an invalid response.",
    });
    expect(normalizeNativeResponse({ ok: false, type: "error", error: "failed" })).toEqual({
      ok: false,
      type: "error",
      error: "failed",
    });
  });
});

describe("Native Messaging port flow", () => {
  test("sends request, handles ready event, then resolves final feedback", async () => {
    const chromeMock = installChromeMock();
    const readyUrls: string[] = [];
    const resultPromise = sendNativeRequest(
      { type: "annotateClipboard", text: "message" },
      { onReady: url => readyUrls.push(url) },
    );

    expect(chromeMock.postedMessages).toEqual([{ type: "annotateClipboard", text: "message" }]);
    chromeMock.emitMessage({ ok: true, type: "ready", url: "http://127.0.0.1:19432" });
    await Promise.resolve();
    chromeMock.emitMessage({ ok: true, type: "feedback", feedback: "notes" });

    await expect(resultPromise).resolves.toEqual({ ok: true, type: "feedback", feedback: "notes" });
    expect(readyUrls).toEqual(["http://127.0.0.1:19432"]);
  });

  test("resolves no-feedback decisions", async () => {
    const chromeMock = installChromeMock();
    const resultPromise = sendNativeRequest({ type: "annotateClipboard", text: "message" });
    chromeMock.emitMessage({ ok: true, type: "ready", url: "http://127.0.0.1:19432" });
    chromeMock.emitMessage({ ok: true, type: "no-feedback", decision: "approved" });

    await expect(resultPromise).resolves.toEqual({
      ok: true,
      type: "no-feedback",
      decision: "approved",
    });
  });

  test("reports disconnect before ready", async () => {
    const chromeMock = installChromeMock();
    const resultPromise = sendNativeRequest({ type: "annotateClipboard", text: "message" });
    chromeMock.emitDisconnect("host failed");

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      type: "error",
      error: "host failed",
    });
  });

  test("reports ready callback failures", async () => {
    const chromeMock = installChromeMock();
    const resultPromise = sendNativeRequest(
      { type: "annotateClipboard", text: "message" },
      { onReady: () => { throw new Error("tab create failed"); } },
    );
    chromeMock.emitMessage({ ok: true, type: "ready", url: "http://127.0.0.1:19432" });
    await Promise.resolve();

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      type: "error",
      error: "tab create failed",
    });
  });
});

describe("Chrome tab context", () => {
  test("captures active tab source and placement metadata", async () => {
    installChromeMock({
      tabs: [{ url: "https://gemini.google.com/", title: "Gemini", windowId: 7, index: 3 }],
    });

    await expect(getActiveTabContext()).resolves.toEqual({
      source: { kind: "clipboard", pageUrl: "https://gemini.google.com/", title: "Gemini" },
      tab: { windowId: 7, index: 3 },
    });
  });

  test("opens Plannotator adjacent to the initiating tab", async () => {
    const chromeMock = installChromeMock();
    await openAdjacentPlannotatorTab("http://127.0.0.1:19432", { windowId: 7, index: 3 });

    expect(chromeMock.createdTabs).toEqual([{
      url: "http://127.0.0.1:19432",
      active: true,
      windowId: 7,
      index: 4,
    }]);
  });

  test("falls back to an active tab when initiating tab metadata is unavailable", async () => {
    const chromeMock = installChromeMock();
    await openAdjacentPlannotatorTab("http://127.0.0.1:19432", {});

    expect(chromeMock.createdTabs).toEqual([{
      url: "http://127.0.0.1:19432",
      active: true,
    }]);
  });

  test("reports Chrome tab creation errors", async () => {
    installChromeMock({ tabCreateError: "cannot create tab" });
    await expect(openAdjacentPlannotatorTab("http://127.0.0.1:19432", {}))
      .rejects.toThrow("cannot create tab");
  });
});
