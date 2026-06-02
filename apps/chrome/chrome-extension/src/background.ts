import { openAdjacentPlannotatorTab, sendNativeRequest } from "./native";
import type { StartAnnotationMessage, StartAnnotationResponse } from "./types";

function isStartAnnotationMessage(message: unknown): message is StartAnnotationMessage {
  if (!message || typeof message !== "object") return false;
  const candidate = message as Partial<StartAnnotationMessage>;
  return (
    candidate.type === "startAnnotateClipboard" &&
    typeof candidate.text === "string" &&
    !!candidate.source &&
    candidate.source.kind === "clipboard" &&
    !!candidate.tab
  );
}

const activeJobs = new Set<Promise<void>>();

async function runClipboardAnnotationJob(message: StartAnnotationMessage): Promise<void> {
  const response = await sendNativeRequest(
    {
      type: "annotateClipboard",
      text: message.text,
      source: message.source,
    },
    {
      onReady: url => openAdjacentPlannotatorTab(url, message.tab),
    },
  );

  if (!response.ok) {
    console.error(`[ClipMark] Native host failed: ${response.error}`);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isStartAnnotationMessage(message)) return false;

  const job = runClipboardAnnotationJob(message);
  activeJobs.add(job);
  job.finally(() => activeJobs.delete(job));

  sendResponse({ ok: true } satisfies StartAnnotationResponse);
  return false;
});
