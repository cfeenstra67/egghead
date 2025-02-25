import { themeClasses, useTheme } from "../lib/theme";
import { cn } from "../lib/utils";
import { TooltipProvider } from "./ui/tooltip";

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
