import { cn } from "@/src/client/lib/utils";
import type * as React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "muted";
}

export function Spinner({
  size = "md",
  color = "primary",
  className,
  ...props
}: SpinnerProps) {
  return (
    <div role="status" className={cn("inline-block", className)} {...props}>
      <svg
        className={cn(
          "animate-spin",
          {
            "h-4 w-4": size === "sm",
            "h-6 w-6": size === "md",
            "h-8 w-8": size === "lg",
            "h-10 w-10": size === "xl",
          },
          {
            "text-primary": color === "primary",
            "text-secondary": color === "secondary",
            "text-muted-foreground": color === "muted",
          },
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
