"use client";

import { Badge } from "@/src/client/components-v2/ui/badge";
import { Button } from "@/src/client/components-v2/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/client/components-v2/ui/collapsible";
import { Input } from "@/src/client/components-v2/ui/input";
import { ScrollArea } from "@/src/client/components-v2/ui/scroll-area";
import { ChevronRight, Globe, Hash, Search } from "lucide-react";
import { useState } from "react";

const websites = [
  { name: "github.com", count: 109 },
  { name: "play.max.com", count: 100 },
  { name: "google.com", count: 84 },
  { name: "x.com", count: 54 },
  { name: "amazon.com", count: 48 },
];

const words = [
  { name: "max", count: 110 },
  { name: "sqlite", count: 93 },
  { name: "x", count: 90 },
  { name: "search", count: 102 },
  { name: "google", count: 89 },
  { name: "kysely", count: 65 },
  { name: "drizzle", count: 49 },
  { name: "main", count: 54 },
  { name: "rollup", count: 50 },
  { name: "chrome", count: 48 },
];

export default function FilterSidebar() {
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [wordFilter, setWordFilter] = useState("");
  const [showAllWebsites, setShowAllWebsites] = useState(false);
  const [showAllWords, setShowAllWords] = useState(false);

  const toggleWebsite = (website: string) => {
    setSelectedWebsites((prev) =>
      prev.includes(website)
        ? prev.filter((w) => w !== website)
        : [...prev, website],
    );
  };

  const toggleWord = (word: string) => {
    setSelectedWords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
    );
  };

  const filteredWords = words.filter((word) =>
    word.name.toLowerCase().includes(wordFilter.toLowerCase()),
  );

  const visibleWebsites = showAllWebsites ? websites : websites.slice(0, 3);
  const visibleWords = showAllWords ? filteredWords : filteredWords.slice(0, 8);

  return (
    <aside className="w-64 border-r bg-background">
      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="p-4 space-y-6">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <h2 className="text-sm font-semibold">Hosts</h2>
              </div>
              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1 transition-all">
              {visibleWebsites.map((site) => (
                <Button
                  key={site.name}
                  variant={
                    selectedWebsites.includes(site.name) ? "secondary" : "ghost"
                  }
                  className="w-full justify-between font-normal h-8 px-2 text-sm"
                  onClick={() => toggleWebsite(site.name)}
                >
                  <span className="truncate">{site.name}</span>
                  <span className="text-muted-foreground">{site.count}</span>
                </Button>
              ))}
              {!showAllWebsites && websites.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full justify-center h-8 text-sm font-normal"
                  onClick={() => setShowAllWebsites(true)}
                >
                  Show more
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4" />
                <h2 className="text-sm font-semibold">Words</h2>
              </div>
              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2 transition-all">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Filter words..."
                  className="pl-8 h-8 text-sm"
                  value={wordFilter}
                  onChange={(e) => setWordFilter(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleWords.map((word) => (
                  <Badge
                    key={word.name}
                    variant={
                      selectedWords.includes(word.name) ? "default" : "outline"
                    }
                    className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground text-xs"
                    onClick={() => toggleWord(word.name)}
                  >
                    {word.name}
                    <span className="ml-1 opacity-70">{word.count}</span>
                  </Badge>
                ))}
              </div>
              {!showAllWords && filteredWords.length > 8 && (
                <Button
                  variant="ghost"
                  className="w-full justify-center h-8 text-sm font-normal"
                  onClick={() => setShowAllWords(true)}
                >
                  Show more
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </aside>
  );
}
