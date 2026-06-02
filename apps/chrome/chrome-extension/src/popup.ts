import { readClipboardText } from "./clipboard";
import { getActiveTabContext, openAdjacentPlannotatorTab, sendNativeRequest } from "./native";
import { createClipboardPayload, shouldCopyFeedback } from "./types";

const metaEl = document.getElementById("meta") as HTMLParagraphElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

function setStatus(message: string, kind: "normal" | "error" = "normal"): void {
  statusEl.textContent = message;
  statusEl.className = kind === "error" ? "status error" : "status";
}

async function openClipboardInPlannotator(): Promise<void> {
  metaEl.textContent = "Reading clipboard...";
  setStatus("Reading clipboard...");

  let text = "";
  try {
    text = await readClipboardText();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Unable to read clipboard.", "error");
    return;
  }

  const payload = createClipboardPayload(text);
  if (!payload.ok) {
    if (payload.reason === "empty") window.close();
    else setStatus(payload.error, "error");
    return;
  }

  metaEl.textContent = `${payload.count.toLocaleString()} characters copied.`;
  setStatus("Opening Plannotator...");
  try {
    const activeTab = await getActiveTabContext();
    const response = await sendNativeRequest({
      type: "annotateClipboard",
      text: payload.text,
      source: activeTab.source,
    }, {
      onReady: async url => {
        await openAdjacentPlannotatorTab(url, activeTab.tab);
        setStatus("Plannotator opened. Waiting for feedback...");
      },
    });

    if (!response.ok) {
      setStatus(response.error, "error");
      return;
    }

    if (shouldCopyFeedback(response)) {
      await navigator.clipboard.writeText(response.feedback);
      setStatus("Annotation feedback copied to clipboard.");
      return;
    }

    setStatus("Plannotator closed without feedback. Clipboard was not changed.");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to open Plannotator.", "error");
  }
}

void openClipboardInPlannotator();
