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

function shouldRunNativeHost(): boolean {
  const argv0 = process.argv[0] || "";
  const argv1 = process.argv[1] || "";
  return (
    import.meta.main ||
    argv0.endsWith("plannotator-chrome-native-host") ||
    argv1.endsWith("/host.ts") ||
    argv1.endsWith("\\host.ts")
  );
}

if (shouldRunNativeHost()) {
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
