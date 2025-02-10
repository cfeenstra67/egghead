import { Button } from "@/src/client/components/ui/button";
import { ScrollArea } from "@/src/client/components/ui/scroll-area";
import { useState } from "react";
import { HistoryItem } from "./history-item";

type HistoryEntry = {
  id: number;
  title: string;
  url: string;
  visitedAt: Date;
};

export default function HistoryList() {
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: 1,
      title: "Google",
      url: "https://www.google.com",
      visitedAt: new Date(),
    },
    {
      id: 2,
      title: "GitHub",
      url: "https://github.com",
      visitedAt: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      id: 3,
      title: "Stack Overflow",
      url: "https://stackoverflow.com",
      visitedAt: new Date(Date.now() - 1000 * 60 * 15),
    },
  ]);

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[400px] w-full border rounded-md p-4">
        {history.length === 0 ? (
          <p className="text-center text-gray-500">No history to display</p>
        ) : (
          history.map((entry) => <HistoryItem key={entry.id} entry={entry} />)
        )}
      </ScrollArea>
      <Button onClick={clearHistory} variant="destructive">
        Clear History
      </Button>
    </div>
  );
}
