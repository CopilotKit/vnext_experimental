import type { BinaryInputContent, InputContent, TextInputContent } from "@ag-ui/client";

export type UserMessageContent = string | InputContent[] | undefined;

function toInputContentArray(content: UserMessageContent): InputContent[] {

  if (!content) {
    return [];
  }

  if (typeof content === "string") {
    return [
      {
        type: "text",
        text: content,
      } satisfies TextInputContent,
    ];
  }

  return content;
}

export function normalizeUserMessageContents(content: UserMessageContent): InputContent[] {
  return toInputContentArray(content);
}

export function getUserMessageTextContents(
  content: UserMessageContent | InputContent[],
): TextInputContent[] {
  const contents = Array.isArray(content) ? content : toInputContentArray(content);
  return contents.filter((part): part is TextInputContent => part.type === "text");
}

export function getUserMessageTextContent(content: UserMessageContent | InputContent[]): string {
  return getUserMessageTextContents(content)
    .map((part) => part.text)
    .join("\n\n");
}

export function getUserMessageBinaryContents(
  content: UserMessageContent | InputContent[],
): BinaryInputContent[] {
  const contents = Array.isArray(content) ? content : toInputContentArray(content);
  return contents.filter((part): part is BinaryInputContent => part.type === "binary");
}

export function hasUserMessageTextContent(content: UserMessageContent | InputContent[]): boolean {
  return getUserMessageTextContents(content).some((part) => part.text.trim().length > 0);
}

export function isUserMessageContentEmpty(content: UserMessageContent | InputContent[]): boolean {
  const contents = Array.isArray(content) ? content : toInputContentArray(content);
  if (contents.length === 0) {
    return true;
  }

  return contents.every((part) => {
    if (part.type === "text") {
      return part.text.trim().length === 0;
    }
    return !part.data && !part.url;
  });
}
