export const MAX_CLIPBOARD_TEXT_CHARS = 200_000;
export const NATIVE_HOST_NAME = "ai.plannotator.clipboard";

export interface NativeSource {
  kind: "clipboard";
  pageUrl?: string;
  title?: string;
}

export interface NativeRequest {
  type: "annotateClipboard";
  text: string;
  source?: NativeSource;
}

export type NativeResponse =
  | { ok: true; status: "feedback"; feedback: string }
  | { ok: true; status: "no-feedback"; decision: "approved" | "dismissed" }
  | { ok: false; error: string };

export type ClipboardPayload =
  | { ok: true; text: string; count: number }
  | { ok: false; reason: "empty"; error: string }
  | { ok: false; reason: "too-large"; error: string };

export function createClipboardPayload(text: string): ClipboardPayload {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "empty", error: "Clipboard is empty." };
  if (text.length > MAX_CLIPBOARD_TEXT_CHARS) {
    return {
      ok: false,
      reason: "too-large",
      error: `Clipboard text is too large (${text.length.toLocaleString()} characters).`,
    };
  }

  return {
    ok: true,
    text,
    count: text.length,
  };
}

export function shouldCopyFeedback(response: NativeResponse): response is { ok: true; status: "feedback"; feedback: string } {
  return response.ok === true && response.status === "feedback" && response.feedback.trim() !== "";
}
