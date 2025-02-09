import { Toaster } from "../components-v2/ui/toaster";
import { TooltipProvider } from "../components-v2/ui/tooltip";
import { themeClasses, useTheme } from "../lib/theme";
import { cn } from "../lib/utils";
import NavBar from "./NavBar";

export interface LayoutProps {
  children: React.ReactNode | React.ReactNode[];
  searchDisabled?: boolean;
}

export default function Layout({ children, searchDisabled }: LayoutProps) {
  const theme = useTheme();

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex min-h-screen flex-col bg-background text-foreground dark text-base",
          themeClasses[theme],
        )}
      >
        <NavBar searchDisabled={searchDisabled} />
        <div className="flex flex-1 overflow-hidden h-full">{children}</div>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
