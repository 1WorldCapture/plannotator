export const MAX_CLIPBOARD_TEXT_CHARS = 200_000;

export interface ClipboardSource {
  kind?: "clipboard";
  pageUrl?: string;
  title?: string;
}

export interface AnnotateClipboardRequest {
  type: "annotateClipboard";
  text: string;
  source?: ClipboardSource;
}

export type NativeHostResponse =
  | { ok: true; status: "feedback"; feedback: string }
  | { ok: true; status: "no-feedback"; decision: "approved" | "dismissed" }
  | { ok: false; error: string };

export function validateAnnotateClipboardRequest(input: unknown): AnnotateClipboardRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Request must be an object");
  }

  const request = input as Record<string, unknown>;
  if (request.type !== "annotateClipboard") {
    throw new Error("Unsupported request type");
  }
  if (typeof request.text !== "string" || request.text.trim() === "") {
    throw new Error("Clipboard text is empty");
  }
  if (request.text.length > MAX_CLIPBOARD_TEXT_CHARS) {
    throw new Error(`Clipboard text exceeds ${MAX_CLIPBOARD_TEXT_CHARS} characters`);
  }

  const validated: AnnotateClipboardRequest = {
    type: "annotateClipboard",
    text: request.text,
  };

  if (request.source !== undefined) {
    if (!request.source || typeof request.source !== "object") {
      throw new Error("Source metadata must be an object");
    }
    const source = request.source as Record<string, unknown>;
    validated.source = {};
    if (source.kind !== undefined) {
      if (source.kind !== "clipboard") throw new Error("Unsupported source kind");
      validated.source.kind = "clipboard";
    }
    if (source.pageUrl !== undefined) {
      if (typeof source.pageUrl !== "string") throw new Error("Source pageUrl must be a string");
      validated.source.pageUrl = source.pageUrl;
    }
    if (source.title !== undefined) {
      if (typeof source.title !== "string") throw new Error("Source title must be a string");
      validated.source.title = source.title;
    }
  }

  return validated;
}
