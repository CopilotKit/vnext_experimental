import {
  DEVTOOLS_INSPECTOR_HOST_TAG,
  defineDevtoolsInspectorHost,
  type AgentsPayload,
  type ContextPayload,
  type EventsPatchPayload,
  type InitInstancePayload,
  type RuntimeStatusPayload,
  type ToolsPayload,
} from "@copilotkitnext/devtools-inspector";
import { chunkEnvelope, reassembleEnvelope } from "./shared/chunking";
import { EXTENSION_SOURCE, type Envelope } from "./shared/protocol";

type HostElement = HTMLElement & {
  updateFromInit?: (payload: InitInstancePayload) => void;
  updateFromStatus?: (payload: RuntimeStatusPayload) => void;
  updateFromAgents?: (payload: AgentsPayload) => void;
  updateFromTools?: (payload: ToolsPayload) => void;
  updateFromContext?: (payload: ContextPayload) => void;
  updateFromEvents?: (payload: EventsPatchPayload) => void;
};

defineDevtoolsInspectorHost();

const tabId = chrome.devtools.inspectedWindow.tabId;
const port = chrome.runtime.connect({ name: `monitor${tabId}` });
const buffer = new Map<string, { header: Envelope; chunks: string[] }>();

const container = document.getElementById("app") ?? document.body;
const host = document.createElement(DEVTOOLS_INSPECTOR_HOST_TAG) as HostElement;
container.appendChild(host);

const send = (type: Envelope["type"]): void => {
  const envelope: Envelope = { source: EXTENSION_SOURCE, type, tabId };
  chunkEnvelope(envelope).forEach((chunk) => port.postMessage(chunk));
};

const handleEnvelope = (envelope: Envelope): void => {
  switch (envelope.type) {
    case "INIT_INSTANCE":
      host.updateFromInit?.((envelope.payload ?? {}) as InitInstancePayload);
      break;
    case "STATUS":
      host.updateFromStatus?.(envelope.payload as RuntimeStatusPayload);
      break;
    case "AGENTS":
      host.updateFromAgents?.(envelope.payload as AgentsPayload);
      break;
    case "TOOLS":
      host.updateFromTools?.(envelope.payload as ToolsPayload);
      break;
    case "CONTEXT":
      host.updateFromContext?.(envelope.payload as ContextPayload);
      break;
    case "EVENTS_PATCH":
      host.updateFromEvents?.(envelope.payload as EventsPatchPayload);
      break;
    default:
      break;
  }
};

port.onMessage.addListener((message) => {
  const assembled = reassembleEnvelope(message as Envelope, buffer);
  if (!assembled) {
    return;
  }

  handleEnvelope(assembled);
});

port.onDisconnect.addListener(() => {
  buffer.clear();
});

send("REQUEST_INIT");
send("PANEL_READY");
