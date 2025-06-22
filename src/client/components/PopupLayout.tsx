import { themeClasses, useTheme } from "../lib/theme.js";
import { cn } from "../lib/utils.js";
import { TooltipProvider } from "./ui/tooltip.js";

export interface PopupLayoutProps {
  children?: React.ReactNode;
}

export default function PopupLayout({ children }: PopupLayoutProps) {
  const theme = useTheme();

  return (
    <div
      id="layout"
      className={cn(
        "w-[400px] h-[600px] overflow-hidden bg-background text-foreground text-base",
        themeClasses[theme],
      )}
    >
      <TooltipProvider>{children}</TooltipProvider>
    </div>
  );
}
