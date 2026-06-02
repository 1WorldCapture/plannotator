function readClipboardTextWithPasteCommand(): string | null {
  const textarea = document.createElement("textarea");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";

  try {
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const pasted = document.execCommand("paste");
    if (pasted || textarea.value) return textarea.value;
    return null;
  } catch {
    return null;
  } finally {
    textarea.remove();
  }
}

export async function readClipboardText(): Promise<string> {
  let clipboardError: unknown;

  try {
    window.focus();
    document.body?.focus();
    await Promise.resolve();
    return await navigator.clipboard.readText();
  } catch (err) {
    clipboardError = err;
  }

  const fallbackText = readClipboardTextWithPasteCommand();
  if (fallbackText !== null) return fallbackText;

  throw clipboardError instanceof Error
    ? clipboardError
    : new Error("Unable to read clipboard.");
}
