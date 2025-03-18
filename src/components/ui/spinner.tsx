/**
 * Loading Spinner Component
 *
 * Provides a visually consistent loading indicator for async operations.
 */
import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/tailwind";

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Size of the spinner - small, medium (default), or large
   */
  size?: "sm" | "md" | "lg";

  /**
   * Text to display alongside the spinner
   */
  text?: string;
}

/**
 * Loading spinner component for indicating async operations
 */
export function LoadingSpinner({
  size = "md",
  text,
  className,
  ...props
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
  };

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <Loader2 className={cn("text-primary animate-spin", sizeClasses[size])} />
      {text && <span className="text-muted-foreground">{text}</span>}
    </div>
  );
}
