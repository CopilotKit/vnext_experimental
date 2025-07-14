import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

const chatTooltip = cva(
  [
    // Positioning
    "absolute z-50 top-full left-1/2",
    // Layout
    "mt-2 px-2 py-1",
    // Transform
    "transform -translate-x-1/2",
    // Background and text
    "bg-black text-white",
    // Typography
    "text-xs",
    // Shape
    "rounded whitespace-nowrap",
    // Interactions
    "pointer-events-none",
    // Animation
    "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
  ],
  {
    variants: {},
    defaultVariants: {},
  }
);

export interface ToolbarButtonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  tooltip?: string;
  disabled?: boolean;
  asChild?: boolean;
}

export const ToolbarButton = React.forwardRef<
  HTMLDivElement,
  ToolbarButtonProps
>(
  (
    { tooltip, disabled, asChild = false, children, className, ...props },
    ref
  ) => {
    return (
      <div ref={ref} className={`relative group ${className || ""}`} {...props}>
        {asChild ? <Slot>{children}</Slot> : children}
        {tooltip && disabled !== true && (
          <div className={chatTooltip()}>{tooltip}</div>
        )}
      </div>
    );
  }
);
ToolbarButton.displayName = "ToolbarButton";
