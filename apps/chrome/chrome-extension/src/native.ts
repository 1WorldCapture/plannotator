import {
  NATIVE_HOST_NAME,
  type InitiatingTab,
  type NativeFinalMessage,
  type NativeMessage,
  type NativeRequest,
  type NativeSource,
} from "./types";

export function normalizeNativeMessage(response: unknown): NativeMessage {
  if (!response || typeof response !== "object" || !("ok" in response)) {
    return { ok: false, type: "error", error: "Native host returned an invalid response." };
  }

  const candidate = response as Partial<NativeMessage>;
  if (candidate.ok === false) {
    return {
      ok: false,
      type: "error",
      error: typeof candidate.error === "string" ? candidate.error : "Native host returned an error.",
    };
  }

  if (
    candidate.ok === true &&
    candidate.type === "ready" &&
    typeof candidate.url === "string" &&
    candidate.url.trim() !== ""
  ) {
    return { ok: true, type: "ready", url: candidate.url };
  }

  if (
    candidate.ok === true &&
    candidate.type === "feedback" &&
    typeof candidate.feedback === "string"
  ) {
    return { ok: true, type: "feedback", feedback: candidate.feedback };
  }

  if (
    candidate.ok === true &&
    candidate.type === "no-feedback" &&
    (candidate.decision === "approved" || candidate.decision === "dismissed")
  ) {
    return { ok: true, type: "no-feedback", decision: candidate.decision };
  }

  return { ok: false, type: "error", error: "Native host returned an invalid response." };
}

export const normalizeNativeResponse = normalizeNativeMessage;

export function sendNativeRequest(
  request: NativeRequest,
  options: { onReady?: (url: string) => void | Promise<void> } = {},
): Promise<NativeFinalMessage> {
  return new Promise(resolve => {
    let settled = false;
    let sawReady = false;
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    function settle(response: NativeFinalMessage): void {
      if (settled) return;
      settled = true;
      resolve(response);
    }

    port.onMessage.addListener(message => {
      const normalized = normalizeNativeMessage(message);
      if (!normalized.ok) {
        settle(normalized);
        return;
      }

      if (normalized.type === "ready") {
        sawReady = true;
        let readyResult: void | Promise<void>;
        try {
          readyResult = options.onReady?.(normalized.url);
        } catch (err) {
          settle({
            ok: false,
            type: "error",
            error: err instanceof Error ? err.message : String(err),
          });
          port.disconnect();
          return;
        }
        Promise.resolve(readyResult).catch(err => {
          settle({
            ok: false,
            type: "error",
            error: err instanceof Error ? err.message : String(err),
          });
          port.disconnect();
        });
        return;
      }

      settle(normalized);
    });

    port.onDisconnect.addListener(() => {
      if (settled) return;
      const error = chrome.runtime.lastError?.message ||
        (sawReady
          ? "Native host disconnected before returning a final response."
          : "Native host disconnected before opening Plannotator.");
      settle({ ok: false, type: "error", error });
    });

    try {
      port.postMessage(request);
    } catch (err) {
      settle({
        ok: false,
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

export function getActiveTabContext(): Promise<{ source: NativeSource; tab: InitiatingTab }> {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0] || {};
      resolve({
        source: {
          kind: "clipboard",
          ...(tab.url ? { pageUrl: tab.url } : {}),
          ...(tab.title ? { title: tab.title } : {}),
        },
        tab: {
          ...(typeof tab.windowId === "number" ? { windowId: tab.windowId } : {}),
          ...(typeof tab.index === "number" ? { index: tab.index } : {}),
        },
      });
    });
  });
}

export async function getActiveTabSource(): Promise<NativeSource> {
  const { source } = await getActiveTabContext();
  return source;
}

export function openAdjacentPlannotatorTab(url: string, tab: InitiatingTab): Promise<void> {
  return new Promise((resolve, reject) => {
    const createProperties: { url: string; active: true; windowId?: number; index?: number } = {
      url,
      active: true,
      ...(typeof tab.windowId === "number" ? { windowId: tab.windowId } : {}),
      ...(typeof tab.index === "number" ? { index: tab.index + 1 } : {}),
    };

    chrome.tabs.create(createProperties, () => {
      const error = chrome.runtime.lastError?.message;
      if (error) reject(new Error(error));
      else resolve();
    });
  });
}
