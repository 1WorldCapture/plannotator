import { readNativeMessage, writeNativeMessage } from "./protocol";
import { validateAnnotateClipboardRequest, type NativeHostFinalMessage } from "./request";
import { runClipboardAnnotation } from "./plannotator";

export async function handleNativeMessage(
  input: unknown,
  writeMessage: typeof writeNativeMessage = writeNativeMessage,
): Promise<NativeHostFinalMessage> {
  const request = validateAnnotateClipboardRequest(input);
  return runClipboardAnnotation(request, {
    onReady: url => {
      writeMessage({ ok: true, type: "ready", url });
    },
  });
}

if (import.meta.main) {
  try {
    const input = readNativeMessage();
    const response = await handleNativeMessage(input);
    writeNativeMessage(response);
  } catch (err) {
    writeNativeMessage({
      ok: false,
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    } satisfies NativeHostFinalMessage);
  }
}
