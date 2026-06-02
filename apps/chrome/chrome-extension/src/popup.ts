import { readClipboardText } from "./clipboard";
import { getActiveTabContext } from "./native";
import { createClipboardPayload, type StartAnnotationMessage, type StartAnnotationResponse } from "./types";

const metaEl = document.getElementById("meta") as HTMLParagraphElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

function setStatus(message: string, kind: "normal" | "error" = "normal"): void {
  statusEl.textContent = message;
  statusEl.className = kind === "error" ? "status error" : "status";
}

function startAnnotationInBackground(message: StartAnnotationMessage): Promise<StartAnnotationResponse> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(message, response => {
      const error = chrome.runtime.lastError?.message;
      if (error) {
        resolve({ ok: false, error });
        return;
      }
      if (response && typeof response === "object" && (response as StartAnnotationResponse).ok === true) {
        resolve({ ok: true });
        return;
      }
      resolve({ ok: false, error: "Background worker did not accept the annotation request." });
    });
  });
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
    const response = await startAnnotationInBackground({
      type: "startAnnotateClipboard",
      text: payload.text,
      source: activeTab.source,
      tab: activeTab.tab,
    });

    if (!response.ok) {
      setStatus(response.error, "error");
      return;
    }

    setStatus("Plannotator opened. Feedback will be copied after submission.");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to open Plannotator.", "error");
  }
}

void openClipboardInPlannotator();
