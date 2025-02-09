import { Button } from "@/src/client/components-v2/ui/button";
import { Input } from "@/src/client/components-v2/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { Download, Search, Settings2, Share2, Trash2 } from "lucide-react";

interface NavBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function NavBar({ searchQuery, onSearchChange }: NavBarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center ml-2">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/icon-128-qZ6usjiJ5DJAt9SHlBN48MmzEzz85Q.png"
            alt="Browser History Logo"
            width={28}
            height={28}
            className="rounded"
          />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search history..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end w-[120px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Settings2 className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {}}>
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
      </div>
    </header>
  );
}
