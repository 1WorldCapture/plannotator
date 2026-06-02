import { readNativeMessage, writeNativeMessage } from "./protocol";
import { validateAnnotateClipboardRequest, type NativeHostResponse } from "./request";
import { runClipboardAnnotation } from "./plannotator";

export async function handleNativeMessage(input: unknown): Promise<NativeHostResponse> {
  const request = validateAnnotateClipboardRequest(input);
  return runClipboardAnnotation(request);
}

if (import.meta.main) {
  try {
    const input = readNativeMessage();
    const response = await handleNativeMessage(input);
    writeNativeMessage(response);
  } catch (err) {
    writeNativeMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies NativeHostResponse);
  }
}
