import { readSync, writeSync } from "node:fs";

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

export function readNativeMessage(fd = 0): unknown {
  const header = Buffer.alloc(HEADER_BYTES);
  let headerOffset = 0;
  while (headerOffset < HEADER_BYTES) {
    const bytes = readSync(fd, header, headerOffset, HEADER_BYTES - headerOffset, null);
    if (bytes === 0) throw new Error("No native message received");
    headerOffset += bytes;
  }

  const length = header.readUInt32LE(0);
  if (length > MAX_NATIVE_MESSAGE_BYTES) {
    throw new Error("Native message exceeds maximum size");
  }

  const body = Buffer.alloc(length);
  let bodyOffset = 0;
  while (bodyOffset < length) {
    const bytes = readSync(fd, body, bodyOffset, length - bodyOffset, null);
    if (bytes === 0) throw new Error("Native message body is incomplete");
    bodyOffset += bytes;
  }

  return JSON.parse(body.toString("utf8"));
}

export function writeNativeMessage(message: unknown, fd = 1): void {
  const encoded = encodeNativeMessage(message);
  writeSync(fd, encoded);
}
