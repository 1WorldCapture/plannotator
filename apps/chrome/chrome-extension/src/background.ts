import { copyTextToClipboard } from "./clipboard-write";
import { openAdjacentPlannotatorTab, sendNativeRequest } from "./native";
import { shouldCopyFeedback, type StartAnnotationMessage, type StartAnnotationResponse } from "./types";

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

async function runClipboardAnnotationJob(
  message: StartAnnotationMessage,
  reportStartup: (response: StartAnnotationResponse) => void,
): Promise<void> {
  let startupReported = false;
  const reportOnce = (response: StartAnnotationResponse): void => {
    if (startupReported) return;
    startupReported = true;
    reportStartup(response);
  };

  const response = await sendNativeRequest(
    {
      type: "annotateClipboard",
      text: message.text,
      source: message.source,
    },
    {
      onReady: async url => {
        await openAdjacentPlannotatorTab(url, message.tab);
        reportOnce({ ok: true });
      },
    },
  );

  if (!response.ok) {
    console.error(`[ClipMark] Native host failed: ${response.error}`);
    reportOnce({ ok: false, error: response.error });
    return;
  }

  if (shouldCopyFeedback(response)) {
    try {
      await copyTextToClipboard(response.feedback);
    } catch (err) {
      console.error(`[ClipMark] Extension clipboard copy failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  reportOnce({ ok: true });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isStartAnnotationMessage(message)) return false;

  const job = runClipboardAnnotationJob(message, sendResponse);
  activeJobs.add(job);
  job.finally(() => activeJobs.delete(job));

  return true;
});
