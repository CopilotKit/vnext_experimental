import React from "react";
import { Suggestion } from "@copilotkitnext/core";
import { renderSlot, WithSlots } from "@/lib/slots";
import { cn } from "@/lib/utils";
import CopilotChatSuggestionPill, {
  CopilotChatSuggestionPillProps,
} from "./CopilotChatSuggestionPill";

const DefaultContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function DefaultContainer({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-2",
        className,
      )}
      {...props}
    />
  );
});

export type CopilotChatSuggestionViewProps = WithSlots<
  {
    container: typeof DefaultContainer;
    suggestion: typeof CopilotChatSuggestionPill;
  },
  {
    suggestions: Suggestion[];
    onSelectSuggestion?: (suggestion: Suggestion, index: number) => void;
    loadingIndexes?: ReadonlyArray<number>;
  } & React.HTMLAttributes<HTMLDivElement>
>;

export const CopilotChatSuggestionView = React.forwardRef<
  HTMLDivElement,
  CopilotChatSuggestionViewProps
>(function CopilotChatSuggestionView(
  {
    suggestions,
    onSelectSuggestion,
    loadingIndexes,
    container,
    suggestion: suggestionSlot,
    className,
    children,
    ...restProps
  },
  ref,
) {
  const loadingSet = React.useMemo(() => {
    if (!loadingIndexes || loadingIndexes.length === 0) {
      return new Set<number>();
    }
    return new Set(loadingIndexes);
  }, [loadingIndexes]);

  const ContainerElement = renderSlot(container, DefaultContainer, {
    ref,
    className,
    ...restProps,
  });

  const suggestionElements = suggestions.map((suggestion, index) => {
    const pill = renderSlot<
      typeof CopilotChatSuggestionPill,
      CopilotChatSuggestionPillProps
    >(suggestionSlot, CopilotChatSuggestionPill, {
      children: suggestion.title,
      isLoading: loadingSet.has(index),
      type: "button",
      onClick: () => onSelectSuggestion?.(suggestion, index),
    });

    return React.cloneElement(pill, {
      key: `${suggestion.title}-${index}`,
    });
  });

  const boundContainer = React.cloneElement(
    ContainerElement,
    undefined,
    suggestionElements,
  );

  if (typeof children === "function") {
    const sampleSuggestion = renderSlot<
      typeof CopilotChatSuggestionPill,
      CopilotChatSuggestionPillProps
    >(suggestionSlot, CopilotChatSuggestionPill, {
      children: suggestions[0]?.title ?? "",
      isLoading: suggestions.length > 0 ? loadingSet.has(0) : false,
      type: "button",
    });

    return (
      <>
        {children({
          container: boundContainer,
          suggestion: sampleSuggestion,
          suggestions,
          onSelectSuggestion,
          loadingIndexes,
          className,
          ...restProps,
        })}
      </>
    );
  }

  if (children) {
    return (
      <>
        {boundContainer}
        {children}
      </>
    );
  }

  return boundContainer;
});

CopilotChatSuggestionView.displayName = "CopilotChatSuggestionView";

export default CopilotChatSuggestionView;
