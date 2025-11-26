import type { Envelope } from "./protocol";
import { MAX_PAYLOAD_SIZE, PAYLOAD_CHUNK_SIZE } from "./protocol";

type ChunkBuffer = {
  header: Envelope;
  chunks: string[];
};

const randomId = (): string => {
  const maybeCrypto = typeof globalThis !== "undefined" ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto : null;
  if (maybeCrypto?.randomUUID) {
    return maybeCrypto.randomUUID();
  }
  return `chunk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function chunkEnvelope<T>(envelope: Envelope<T>): Envelope<string | T>[] {
  if (envelope.payload === undefined || envelope.payload === null) {
    return [envelope];
  }

  const serialized = JSON.stringify(envelope.payload);
  if (serialized.length <= MAX_PAYLOAD_SIZE) {
    return [envelope];
  }

  const id = envelope.id ?? randomId();
  const parts: Envelope<string | T>[] = [];
  for (let offset = 0; offset < serialized.length; offset += PAYLOAD_CHUNK_SIZE) {
    const slice = serialized.slice(offset, offset + PAYLOAD_CHUNK_SIZE);
    const split = offset === 0 ? "start" : offset + PAYLOAD_CHUNK_SIZE >= serialized.length ? "end" : "chunk";
    parts.push({
      ...envelope,
      payload: undefined,
      payloadChunk: slice,
      split,
      id,
    });
  }

  return parts;
}

export function reassembleEnvelope(envelope: Envelope, buffer: Map<string, ChunkBuffer>): Envelope | null {
  if (!envelope.split) {
    return envelope;
  }

  const id = envelope.id ?? "unknown";
  const existing = buffer.get(id) ?? { header: { ...envelope, payload: undefined, payloadChunk: undefined }, chunks: [] };
  existing.header = { ...existing.header, ...envelope, payload: undefined, payloadChunk: undefined, split: undefined };
  existing.chunks.push(envelope.payloadChunk ?? "");

  if (envelope.split === "end") {
    const payloadString = existing.chunks.join("");
    buffer.delete(id);
    try {
      const parsed = payloadString ? JSON.parse(payloadString) : undefined;
      return { ...existing.header, payload: parsed };
    } catch (error) {
      console.warn("[copilotkit-extension] Failed to parse chunked payload", error);
      return null;
    }
  }

  buffer.set(id, existing);
  return null;
}
