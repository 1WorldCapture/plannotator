const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
export const CLIPBOARD_WRITE_MESSAGE_TYPE = "copyTextToClipboard";

export type ClipboardWriteMessage = {
  type: typeof CLIPBOARD_WRITE_MESSAGE_TYPE;
  text: string;
};

type ClipboardWriteResponse =
  | { ok: true }
  | { ok: false; error: string };

export function isClipboardWriteMessage(message: unknown): message is ClipboardWriteMessage {
  if (!message || typeof message !== "object") return false;
  const candidate = message as Partial<ClipboardWriteMessage>;
  return candidate.type === CLIPBOARD_WRITE_MESSAGE_TYPE && typeof candidate.text === "string";
}

async function ensureOffscreenDocument(): Promise<void> {
  const offscreen = chrome.offscreen;
  if (!offscreen?.createDocument) {
    throw new Error("Chrome offscreen documents are unavailable for clipboard writes.");
  }

  if (offscreen.hasDocument && await offscreen.hasDocument()) return;

  try {
    await offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ["CLIPBOARD"],
      justification: "Copy submitted Plannotator annotation feedback to the clipboard.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/single offscreen document|already exists/i.test(message)) throw err;
  }
}

function sendClipboardWriteMessage(text: string): Promise<ClipboardWriteResponse> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { type: CLIPBOARD_WRITE_MESSAGE_TYPE, text } satisfies ClipboardWriteMessage,
      response => {
        const runtimeError = chrome.runtime.lastError?.message;
        if (runtimeError) {
          resolve({ ok: false, error: runtimeError });
          return;
        }

        if (response && typeof response === "object" && (response as ClipboardWriteResponse).ok === true) {
          resolve({ ok: true });
          return;
        }

        const error = response && typeof response === "object" && typeof (response as { error?: unknown }).error === "string"
          ? (response as { error: string }).error
          : "Clipboard feedback writer did not acknowledge the copy request.";
        resolve({ ok: false, error });
      },
    );
  });
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (!text.trim()) return;
  await ensureOffscreenDocument();
  const response = await sendClipboardWriteMessage(text);
  if (!response.ok) throw new Error(response.error);
}
