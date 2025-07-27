import { ReactToolCallRender } from "@/types/react-tool-call-render";
import { useCopilotKit } from "../providers/CopilotKitProvider";
import { FrontendTool } from "@copilotkit/core";

export type ReactHumanInTheLoop<T extends Record<string, any> = {}> = Omit<
  FrontendTool<T>,
  "handler"
> & {
  render: ReactToolCallRender<T>["render"] &
    (
      | {
          status: "inProgress";
          respond: undefined;
        }
      | {
          status: "executing";
          respond: (result: unknown) => Promise<void>;
        }
      | {
          status: "complete";
          respond: undefined;
        }
    );
};

export function useHumanInTheLoop<T extends Record<string, any> = {}>(
  tool: ReactHumanInTheLoop<T>
) {}
