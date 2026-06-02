import { NATIVE_HOST_NAME, type NativeRequest, type NativeResponse, type NativeSource } from "./types";

export function normalizeNativeResponse(response: unknown): NativeResponse {
  if (!response || typeof response !== "object" || !("ok" in response)) {
    return { ok: false, error: "Native host returned an invalid response." };
  }

  const candidate = response as Partial<NativeResponse>;
  if (candidate.ok === false) {
    return {
      ok: false,
      error: typeof candidate.error === "string" ? candidate.error : "Native host returned an error.",
    };
  }

  if (
    candidate.ok === true &&
    candidate.status === "feedback" &&
    typeof candidate.feedback === "string"
  ) {
    return { ok: true, status: "feedback", feedback: candidate.feedback };
  }

  if (
    candidate.ok === true &&
    candidate.status === "no-feedback" &&
    (candidate.decision === "approved" || candidate.decision === "dismissed")
  ) {
    return { ok: true, status: "no-feedback", decision: candidate.decision };
  }

  return { ok: false, error: "Native host returned an invalid response." };
}

export function sendNativeRequest(request: NativeRequest): Promise<NativeResponse> {
  return new Promise(resolve => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, request, response => {
      const error = chrome.runtime.lastError?.message;
      if (error) {
        resolve({ ok: false, error });
        return;
      }

      resolve(normalizeNativeResponse(response));
    });
  });
}

export function getActiveTabSource(): Promise<NativeSource> {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0] || {};
      resolve({
        kind: "clipboard",
        ...(tab.url ? { pageUrl: tab.url } : {}),
        ...(tab.title ? { title: tab.title } : {}),
      });
    });
  });
}
