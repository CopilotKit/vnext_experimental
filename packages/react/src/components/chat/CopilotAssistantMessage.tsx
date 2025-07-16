import { AssistantMessage } from "@ag-ui/core";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

export interface CopilotAssistantMessageProps {
  message: AssistantMessage;
}

const CopilotAssistantMessage = ({ message }: CopilotAssistantMessageProps) => {
  const md = message.content;
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        [
          rehypePrettyCode,
          {
            theme: { light: "github-light", dark: "github-dark" }, // Shiki themes
            keepBackground: false,
          },
        ],
      ]}
    >
      {"hello"}
    </Markdown>
  );
};

export default CopilotAssistantMessage;
