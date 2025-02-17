import { themeClasses, useTheme } from "../lib/theme";
import { cn } from "../lib/utils";
import NavBar, { type NavbarProps } from "./NavBar";
import { Toaster } from "./ui/toaster";
import { TooltipProvider } from "./ui/tooltip";

export interface LayoutProps extends NavbarProps {
  children: React.ReactNode | React.ReactNode[];
}

export default function Layout({ children, ...navbarProps }: LayoutProps) {
  const theme = useTheme();

  return (
    <div
      id="layout"
      className={cn(
        "h-screen bg-background text-foreground text-base default-global overflow-hidden",
        themeClasses[theme],
      )}
    >
      <TooltipProvider>
        <NavBar {...navbarProps} />
        <div className="pt-14 flex h-full">{children}</div>
        <Toaster />
      </TooltipProvider>
    </div>
  );
}
