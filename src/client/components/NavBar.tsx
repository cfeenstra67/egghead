import { Book, Search, Settings2 } from "lucide-react";
import { useContext } from "react";
import { Link } from "wouter";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import EggheadIcon from "../icons/egghead.svg";
import { AppContext } from "../lib";

export interface NavbarProps {
  searchDisabled?: boolean;
}

export default function NavBar({ searchDisabled }: NavbarProps) {
  const { query, setQuery } = useContext(AppContext);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center">
        <div className="flex items-center ml-2">
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
                type="search"
                placeholder="Search history..."
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={searchDisabled}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end w-[120px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2" asChild>
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
      </div>
    </header>
  );
}
