import { basename } from "node:path";
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

export function shouldRunNativeHost(
  argv: string[] = process.argv,
  metaMain = import.meta.main,
): boolean {
  const executable = basename(argv[0] || "");
  const script = argv[1] || "";
  return (
    metaMain ||
    /^plannotator-chrome-native-host(?:-.+)?$/.test(executable) ||
    script.endsWith("/host.ts") ||
    script.endsWith("\\host.ts")
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
