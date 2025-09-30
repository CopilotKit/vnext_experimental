import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopilotChatSuggestionPillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Optional icon to render on the left side when not loading. */
  icon?: React.ReactNode;
  /** Whether the pill should display a loading spinner. */
  isLoading?: boolean;
  /** Optional sublabel rendered below the main label. */
  description?: string;
}

const baseClasses =
  "group inline-flex min-h-9 items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60";

const labelClasses = "whitespace-nowrap";
const descriptionClasses = "text-xs text-muted-foreground";

export const CopilotChatSuggestionPill = React.forwardRef<
  HTMLButtonElement,
  CopilotChatSuggestionPillProps
>(function CopilotChatSuggestionPill(
  { className, children, icon, isLoading, description, type, ...props },
  ref
) {
  const showIcon = !isLoading && icon;

  return (
    <button
      ref={ref}
      data-slot="suggestion-pill"
      className={cn(baseClasses, className)}
      type={type ?? "button"}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        showIcon && <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">{icon}</span>
      )}
      <span className="flex flex-col items-start">
        <span className={labelClasses}>{children}</span>
        {description ? <span className={descriptionClasses}>{description}</span> : null}
      </span>
    </button>
  );
});

CopilotChatSuggestionPill.displayName = "CopilotChatSuggestionPill";

export default CopilotChatSuggestionPill;
