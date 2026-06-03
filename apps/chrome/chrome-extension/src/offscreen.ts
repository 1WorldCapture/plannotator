import { isClipboardWriteMessage } from "./clipboard-write";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isClipboardWriteMessage(message)) return false;

  void navigator.clipboard.writeText(message.text).then(
    () => {
      sendResponse({ ok: true });
    },
    err => {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    },
  );

  return true;
});
