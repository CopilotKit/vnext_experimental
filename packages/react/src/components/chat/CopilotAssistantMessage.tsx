import { AssistantMessage } from "@ag-ui/core";
import ReactMarkdown from "react-markdown";

export interface CopilotAssistantMessageProps {
  message: AssistantMessage;
}

const CopilotAssistantMessage = ({ message }: CopilotAssistantMessageProps) => {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown>{message.content}</ReactMarkdown>
    </div>
  );
};

export default CopilotAssistantMessage;
