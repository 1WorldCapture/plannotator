import { isClipboardWriteMessage } from "./clipboard-write";

const CLIPBOARD_TEXTAREA_ID = "clipboard-text";

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function writeClipboardWithExecCommand(text: string, doc: Document = document): void {
  let textarea = doc.getElementById(CLIPBOARD_TEXTAREA_ID) as HTMLTextAreaElement | null;
  const created = !textarea;

  if (!textarea) {
    textarea = doc.createElement("textarea");
    textarea.id = CLIPBOARD_TEXTAREA_ID;
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    textarea.style.opacity = "0";
    doc.body.appendChild(textarea);
  }

  try {
    textarea.value = text;
    textarea.focus();
    textarea.select();
    if (!doc.execCommand("copy")) {
      throw new Error("document.execCommand('copy') returned false.");
    }
  } finally {
    textarea.value = "";
    if (created) textarea.remove();
  }
}

export async function writeClipboardTextInOffscreenDocument(text: string): Promise<void> {
  if (!text.trim()) return;

  let execCommandError: unknown;
  try {
    writeClipboardWithExecCommand(text);
    return;
  } catch (err) {
    execCommandError = err;
  }

  const writeText = navigator.clipboard?.writeText?.bind(navigator.clipboard);
  if (writeText) {
    try {
      await writeText(text);
      return;
    } catch (err) {
      throw new Error(
        `document.execCommand('copy') failed: ${describeError(execCommandError)}; navigator.clipboard.writeText failed: ${describeError(err)}`,
      );
    }
  }

  throw execCommandError instanceof Error
    ? execCommandError
    : new Error(describeError(execCommandError));
}

export function registerOffscreenClipboardWriter(): void {
  if (typeof chrome === "undefined" || !chrome.runtime?.onMessage?.addListener) return;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isClipboardWriteMessage(message)) return false;

    void writeClipboardTextInOffscreenDocument(message.text).then(
      () => {
        sendResponse({ ok: true });
      },
      err => {
        sendResponse({
          ok: false,
          error: describeError(err),
        });
      },
    );

    return true;
  });
}

registerOffscreenClipboardWriter();
