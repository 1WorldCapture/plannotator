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

export interface InitiatingTab {
  windowId?: number;
  index?: number;
}

export interface StartAnnotationMessage {
  type: "startAnnotateClipboard";
  text: string;
  source: NativeSource;
  tab: InitiatingTab;
}

export type StartAnnotationResponse =
  | { ok: true }
  | { ok: false; error: string };

export type NativeReadyMessage = { ok: true; type: "ready"; url: string };

export type NativeFinalMessage =
  | { ok: true; type: "feedback"; feedback: string }
  | { ok: true; type: "no-feedback"; decision: "approved" | "dismissed" }
  | { ok: false; type: "error"; error: string };

export type NativeMessage =
  | NativeReadyMessage
  | NativeFinalMessage;

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

export function shouldCopyFeedback(response: NativeFinalMessage): response is { ok: true; type: "feedback"; feedback: string } {
  return response.ok === true && response.type === "feedback" && response.feedback.trim() !== "";
}
