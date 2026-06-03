import { writeSync } from "node:fs";

const HEADER_BYTES = 4;
const MAX_NATIVE_MESSAGE_BYTES = 1024 * 1024;

export function encodeNativeMessage(message: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

export function decodeNativeMessage(buffer: Buffer): unknown {
  if (buffer.length < HEADER_BYTES) {
    throw new Error("Native message is missing length header");
  }

  const length = buffer.readUInt32LE(0);
  if (length > MAX_NATIVE_MESSAGE_BYTES) {
    throw new Error("Native message exceeds maximum size");
  }
  if (buffer.length < HEADER_BYTES + length) {
    throw new Error("Native message body is incomplete");
  }

  return JSON.parse(buffer.subarray(HEADER_BYTES, HEADER_BYTES + length).toString("utf8"));
}

export async function readNativeMessage(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalLength = 0;
    let expectedLength = -1;
    let resolved = false;

    const onData = (chunk: Buffer | string) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      chunks.push(buf);
      totalLength += buf.length;

      if (expectedLength === -1 && totalLength >= HEADER_BYTES) {
        const header = Buffer.concat(chunks);
        expectedLength = header.readUInt32LE(0);
        
        if (expectedLength > MAX_NATIVE_MESSAGE_BYTES) {
          cleanup();
          reject(new Error("Native message exceeds maximum size"));
          return;
        }
      }

      if (expectedLength !== -1 && totalLength >= HEADER_BYTES + expectedLength) {
        cleanup();
        const fullBuffer = Buffer.concat(chunks);
        const body = fullBuffer.subarray(HEADER_BYTES, HEADER_BYTES + expectedLength);
        resolved = true;
        resolve(JSON.parse(body.toString("utf8")));
      }
    };

    const onEnd = () => {
      if (resolved) return;
      cleanup();
      if (expectedLength === -1) {
        reject(new Error("No native message received"));
      } else {
        reject(new Error("Native message body is incomplete"));
      }
    };

    const onError = (err: Error) => {
      if (resolved) return;
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      process.stdin.removeListener("data", onData);
      process.stdin.removeListener("end", onEnd);
      process.stdin.removeListener("error", onError);
    };

    process.stdin.on("data", onData);
    process.stdin.on("end", onEnd);
    process.stdin.on("error", onError);
    process.stdin.resume();
  });
}

export function writeNativeMessage(message: unknown, fd = 1): void {
  const encoded = encodeNativeMessage(message);
  writeSync(fd, encoded);
}
