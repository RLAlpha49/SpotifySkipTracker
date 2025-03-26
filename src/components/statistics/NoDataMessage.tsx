import React from "react";
import { Info, BarChart, LineChart, PieChart } from "lucide-react";

interface NoDataMessageProps {
  message: string;
}

export function NoDataMessage({ message }: NoDataMessageProps) {
  // Select a random chart icon to display
  const icons = [
    <BarChart key="bar" className="h-5 w-5 text-amber-500" />,
    <LineChart key="line" className="h-5 w-5 text-amber-500" />,
    <PieChart key="pie" className="h-5 w-5 text-amber-500" />,
  ];

  const randomIcon = icons[Math.floor(Math.random() * icons.length)];

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/50 px-6 py-8 text-center shadow-sm transition-all duration-200 dark:border-amber-800/30 dark:bg-amber-950/20">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        {randomIcon}
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-medium text-amber-800 dark:text-amber-400">
          No Data Available
        </h3>
        <p className="text-amber-700/90 dark:text-amber-400/90">{message}</p>
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <Info className="h-3.5 w-3.5" />
            Keep listening to generate insights
          </div>
        </div>
      </div>
    </div>
  );
}
