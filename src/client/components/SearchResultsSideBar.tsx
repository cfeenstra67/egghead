import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronUp, Globe, Hash, Search } from "lucide-react";
import { useCallback, useContext, useState } from "react";
import type {
  QuerySessionFacetsFacetValue,
  QuerySessionsRequest,
} from "../../server";
import { AppContext } from "../lib";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";

interface HostsComponentProps {
  disabled?: boolean;
  loading?: boolean;
  hosts: QuerySessionFacetsFacetValue[];
  partialCount?: number;
  selectedHosts: string[];
  setSelectedHosts: (hosts: string[]) => void;
}

function HostsComponent({
  disabled,
  loading,
  hosts,
  selectedHosts,
  setSelectedHosts,
  partialCount,
}: HostsComponentProps) {
  const [partialExpanded, setPartialExpanded] = useState<boolean>(false);
  const selectedHostsSet = new Set(selectedHosts);
  const [hostFilter, setHostFilter] = useState("");

  const partial = partialCount ?? 5;

  const filteredHosts = hostFilter
    ? hosts.filter((h) =>
        h.value.toLowerCase().includes(hostFilter.toLowerCase()),
      )
    : hosts;

  const head = partialExpanded
    ? filteredHosts
    : filteredHosts.slice(0, partial);
  const tail = partialExpanded ? [] : filteredHosts.slice(partial);

  const handleHostClick = useCallback(
    (host: string) => {
      if (selectedHostsSet.has(host)) {
        setSelectedHosts(selectedHosts.filter((host2) => host !== host2));
      } else {
        setSelectedHosts(selectedHosts.concat([host]));
      }
    },
    [selectedHosts, setSelectedHosts],
  );

  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={(o) => setOpen(o)}>
      <CollapsibleTrigger
        className="flex items-center justify-between w-full gap-2"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2 flex-grow">
          <Globe className="w-4 h-4" />
          <div className="text-sm font-semibold flex items-center justify-between flex-grow">
            <span>Hosts</span>
            {loading && <Spinner size="sm" color="muted" />}
          </div>
        </div>
        <ChevronUp
          className={cn("w-4 h-4 transition-transform duration-200", {
            "rotate-180": open,
          })}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1 transition-all">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filter hosts..."
            className="pl-8 h-8 text-sm"
            value={hostFilter}
            onChange={(e) => setHostFilter(e.target.value)}
            disabled={disabled}
          />
        </div>
        {head.map((site) => (
          <Button
            key={site.value}
            variant={selectedHosts.includes(site.value) ? "secondary" : "ghost"}
            className="w-full justify-between font-normal h-8 px-2 text-sm"
            onClick={() => handleHostClick(site.value)}
            disabled={disabled}
          >
            <span className="truncate">{site.value}</span>
            <span className="text-muted-foreground">{site.count}</span>
          </Button>
        ))}
        {!partialExpanded && tail.length > 0 && (
          <Button
            variant="ghost"
            className="w-full justify-center h-8 text-sm font-normal"
            onClick={() => setPartialExpanded(true)}
            disabled={disabled}
          >
            Show more
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface TermsComponentProps {
  disabled?: boolean;
  loading?: boolean;
  terms: QuerySessionFacetsFacetValue[];
  selectedTerms: string[];
  setSelectedTerms: (terms: string[]) => void;
  partialCount?: number;
}

function TermsComponent({
  disabled,
  loading,
  terms,
  selectedTerms,
  setSelectedTerms,
  partialCount,
}: TermsComponentProps) {
  const [partialExpanded, setPartialExpanded] = useState<boolean>(false);
  const selectedTermsSet = new Set(selectedTerms);
  const [wordFilter, setWordFilter] = useState("");

  const partial = partialCount ?? 10;

  const filteredTerms = wordFilter
    ? terms.filter((t) =>
        t.value.toLowerCase().includes(wordFilter.toLowerCase()),
      )
    : terms;

  const head = partialExpanded
    ? filteredTerms
    : filteredTerms.slice(0, partial);
  const tail = partialExpanded ? [] : filteredTerms.slice(partial);

  const handleWordClick = useCallback(
    (word: string) => {
      if (selectedTermsSet.has(word)) {
        setSelectedTerms(selectedTerms.filter((term) => term !== word));
      } else {
        setSelectedTerms(selectedTerms.concat([word]));
      }
    },
    [selectedTerms, setSelectedTerms],
  );

  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={(o) => setOpen(o)}>
      <CollapsibleTrigger
        className="flex items-center justify-between w-full gap-2"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2 flex-grow">
          <Hash className="w-4 h-4" />
          <div className="text-sm font-semibold flex items-center justify-between flex-grow">
            <span>Words</span>
            {loading && <Spinner size="sm" color="muted" />}
          </div>
        </div>
        <ChevronUp
          className={clsx("w-4 h-4 transition-transform duration-200", {
            "rotate-180": open,
          })}
        />
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
            disabled={disabled}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {head.map((word) => (
            <Badge
              key={word.value}
              variant={
                selectedTerms.includes(word.value) ? "default" : "outline"
              }
              className={cn(
                "cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground text-xs",
                {
                  "cursor-not-allowed text-muted-foreground hover:bg-inherit hover:text-muted-foreground":
                    disabled,
                },
              )}
              onClick={() => {
                if (disabled) {
                  return;
                }
                handleWordClick(word.value);
              }}
            >
              {word.value}
              <span className="ml-1 opacity-70">{word.count}</span>
            </Badge>
          ))}
        </div>
        {!partialExpanded && tail.length > 0 && (
          <Button
            variant="ghost"
            className="w-full justify-center h-8 text-sm font-normal"
            onClick={() => setPartialExpanded(true)}
            disabled={disabled}
          >
            Show more
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SearchSideBarProps {
  disabled?: boolean;
  className?: string;
  request: QuerySessionsRequest;
  selectedHosts: string[];
  setSelectedHosts: (hosts: string[]) => void;
  selectedTerms: string[];
  setSelectedTerms: (terms: string[]) => void;
}

export default function SearchSideBar({
  className,
  disabled,
  request,
  selectedHosts,
  setSelectedHosts,
  selectedTerms,
  setSelectedTerms,
}: SearchSideBarProps) {
  const { serverClientFactory } = useContext(AppContext);

  const facets = useQuery({
    queryKey: ["history", request, "facets"],
    enabled: !disabled,
    queryFn: async () => {
      const client = await serverClientFactory();
      return await client.querySessionFacets(request);
    },
  });

  const allHosts = facets.data?.host ?? [];
  const visibleHosts = allHosts.filter((h) => selectedHosts.includes(h.value));
  const nonVisibleHosts = allHosts.filter(
    (h) => !selectedHosts.includes(h.value),
  );
  while (visibleHosts.length < 5 && nonVisibleHosts.length > 0) {
    const item = nonVisibleHosts.shift();
    if (item === undefined) {
      break;
    }
    visibleHosts.push(item);
  }

  return (
    <aside className={cn("w-64 border-r overflow-y-auto", className)}>
      <div className="p-4 space-y-6">
        <HostsComponent
          loading={facets.status === "pending"}
          hosts={facets.data?.host ?? []}
          selectedHosts={selectedHosts}
          setSelectedHosts={setSelectedHosts}
          disabled={disabled}
        />

        <TermsComponent
          loading={facets.status === "pending"}
          terms={facets.data?.term ?? []}
          selectedTerms={selectedTerms}
          setSelectedTerms={setSelectedTerms}
          disabled={disabled}
        />
      </div>
    </aside>
  );
}
