import { chunkEnvelope, reassembleEnvelope } from "./shared/chunking";
import { EXTENSION_SOURCE, PAGE_SOURCE, type Envelope } from "./shared/protocol";

const port = chrome.runtime.connect({ name: "tab" });
const inboundBuffer = new Map<string, { header: Envelope; chunks: string[] }>();

window.addEventListener("message", (event) => {
  const data = event.data as Envelope | undefined;
  if (!data || data.source !== PAGE_SOURCE || event.source !== window) {
    return;
  }

  const chunks = chunkEnvelope(data);
  for (const chunk of chunks) {
    port.postMessage(chunk);
  }
});

port.onMessage.addListener((message) => {
  const assembled = reassembleEnvelope(message as Envelope, inboundBuffer);
  if (!assembled) {
    return;
  }

  const envelope: Envelope = {
    ...assembled,
    source: EXTENSION_SOURCE,
  };

  const chunks = chunkEnvelope(envelope);
  for (const chunk of chunks) {
    window.postMessage(chunk, "*");
  }
});

port.onDisconnect.addListener(() => {
  inboundBuffer.clear();
});
