import { Button } from "@/src/client/components-v2/ui/button";
import { ChartContainer } from "@/src/client/components-v2/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/client/components-v2/ui/dropdown-menu";
import { ScrollArea } from "@/src/client/components-v2/ui/scroll-area";
import { ChevronDown, Download, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import FilterSidebar from "./filter-sidebar";
import { HistoryItem } from "./history-item";
import { NavBar } from "./nav-bar";

const chartData = [
  { date: "Jan 22", visits: 45 },
  { date: "Jan 23", visits: 30 },
  { date: "Jan 24", visits: 60 },
  { date: "Jan 25", visits: 80 },
  { date: "Jan 26", visits: 100 },
  { date: "Jan 27", visits: 70 },
  { date: "Jan 28", visits: 50 },
  { date: "Jan 29", visits: 75 },
  { date: "Jan 30", visits: 45 },
  { date: "Jan 31", visits: 90 },
  { date: "Feb 1", visits: 60 },
  { date: "Feb 2", visits: 120 },
  { date: "Feb 3", visits: 85 },
];

const historyData = [
  {
    id: 1,
    title: "jestjs - Using WebAssembly with Jest and Webpack - Stack Overflow",
    url: "stackoverflow.com",
    timestamp: "10:07 PM",
    linksOpened: 3,
    icon: "🔧",
  },
  {
    id: 2,
    title: "SQLite User Forum: ESM Compatible WASM package",
    url: "sqlite.org",
    timestamp: "10:07 PM",
    linksOpened: 2,
    icon: "📦",
  },
  {
    id: 3,
    title: "rollup wasm not working - Google Search",
    url: "google.com",
    timestamp: "10:07 PM",
    linksOpened: 5,
    icon: "🔍",
  },
  {
    id: 4,
    title:
      "Anidetrix/rollup-plugin-styles: 🎨 Universal Rollup plugin for styles",
    url: "github.com",
    timestamp: "10:07 PM",
    linksOpened: 1,
    icon: "📱",
  },
];

export default function HistoryView() {
  const [activeDate] = useState("Today - Feb 3, 2025");
  const [history, setHistory] = useState(historyData);
  const [searchQuery, setSearchQuery] = useState("");

  const clearHistory = () => {
    setHistory([]);
  };

  const filteredHistory = history.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-screen flex-col">
      <NavBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <div className="flex flex-1 overflow-hidden">
        <FilterSidebar />
        <main className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="border-b">
              <div className="flex items-center justify-between p-4">
                <h1 className="text-2xl font-semibold">Activity</h1>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Actions <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={clearHistory}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Clear All</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      <span>Export History</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="mr-2 h-4 w-4" />
                      <span>Share History</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="px-4 pb-4">
                <ChartContainer className="h-[200px]" config={{}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                      />
                      <YAxis hide domain={[0, "dataMax + 20"]} />
                      <Bar
                        dataKey="visits"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-2">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {activeDate}
                  </h2>
                  <div className="space-y-2">
                    {filteredHistory.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No history to display
                      </p>
                    ) : (
                      filteredHistory.map((item) => (
                        <HistoryItem key={item.id} item={item} />
                      ))
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
