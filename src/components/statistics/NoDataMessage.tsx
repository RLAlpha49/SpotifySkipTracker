import React from "react";

interface NoDataMessageProps {
  message: string;
}

export function NoDataMessage({ message }: NoDataMessageProps) {
  return (
    <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/20">
      <p className="text-amber-800 dark:text-amber-400">{message}</p>
    </div>
  );
}
