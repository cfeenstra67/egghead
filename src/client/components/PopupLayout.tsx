import { themeClasses, useTheme } from "../lib/theme";
import { cn } from "../lib/utils";

export interface PopupLayoutProps {
  children?: React.ReactNode;
}

export default function PopupLayout({ children }: PopupLayoutProps) {
  const theme = useTheme();

  return (
    <div
      className={cn(
        "flex w-[400px] h-[600px] flex-col bg-background text-foreground dark text-base",
        themeClasses[theme],
      )}
    >
      {children}
    </div>
  );
}
