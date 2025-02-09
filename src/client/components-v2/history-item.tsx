import { Button } from "@/src/client/components-v2/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/client/components-v2/ui/dropdown-menu";
import { Separator } from "@/src/client/components-v2/ui/separator";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Link2, MoreVertical } from "lucide-react";
import { useState } from "react";

export function HistoryItem({ item }: any) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-4 p-2 rounded-lg hover:bg-muted/50 group">
        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium leading-none truncate">
            {item.title}
          </h3>
          <div className="flex items-center mt-1 space-x-2 text-xs text-muted-foreground">
            <span>{item.url}</span>
            <Separator className="h-3" orientation="vertical" />
            <span>{item.timestamp}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs flex items-center"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Link2 className="h-4 w-4 mr-1" />
            <span>{item.linksOpened} links</span>
            <ChevronRight
              className={`ml-1 h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Copy Link</DropdownMenuItem>
              <DropdownMenuItem>Share</DropdownMenuItem>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="ml-8 pl-4 border-l border-muted"
          >
            {/* Placeholder for child items */}
            <div className="p-2 rounded-lg hover:bg-muted/50">
              <h4 className="text-sm font-medium">Child Link 1</h4>
              <p className="text-xs text-muted-foreground">
                https://example.com/child1
              </p>
            </div>
            <div className="p-2 rounded-lg hover:bg-muted/50">
              <h4 className="text-sm font-medium">Child Link 2</h4>
              <p className="text-xs text-muted-foreground">
                https://example.com/child2
              </p>
            </div>
            <div className="p-2 rounded-lg hover:bg-muted/50">
              <h4 className="text-sm font-medium">Child Link 3</h4>
              <p className="text-xs text-muted-foreground">
                https://example.com/child3
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
