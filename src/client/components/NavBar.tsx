import { Book, Search, Settings2, X } from "lucide-react";
import { useContext } from "react";
import { Link } from "wouter";
import EggheadIcon from "../icons/egghead.svg";
import { AppContext } from "../lib";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export interface NavbarProps {
  searchDisabled?: boolean;
}

export default function NavBar({ searchDisabled }: NavbarProps) {
  const { query, setQuery } = useContext(AppContext);

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-2 gap-2">
      <div className="flex items-center">
        <Link to="/">
          <EggheadIcon className="w-[28px] h-[28px] fill-muted-foreground cursor-pointer" />
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search history..."
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={searchDisabled}
            />
            {query ? (
              <X
                className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground cursor-pointer"
                onClick={() => setQuery("")}
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end w-[80px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://docs.egghead.camfeenstra.com"
                target="_blank"
                rel="noreferrer"
              >
                <Book className="h-6 w-6 text-muted-foreground" />
                <span className="sr-only">Settings</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Docs</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <Link to="/settings">
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Settings2 className="h-6 w-6 text-muted-foreground" />
                <span className="sr-only">Settings</span>
              </Button>
            </TooltipTrigger>
          </Link>
          <TooltipContent>
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </nav>
  );
}
