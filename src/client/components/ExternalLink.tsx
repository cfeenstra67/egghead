import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useContext } from "react";
import { AppContext } from "../lib/context.js";

export interface ExternalLinkProps {
  href: string;
  newTab?: boolean;
  tabId?: number;
  children?: React.ReactNode;
  className?: string;
  rel?: string;
}

export function useExternalLinkOpener(
  newTab?: boolean,
): (url: string, tabId?: number) => void {
  const { runtime } = useContext(AppContext);
  const queryClient = useQueryClient();

  return useCallback(
    async (url, tabId) => {
      let opened = false;
      if (newTab && tabId && runtime.openTabId) {
        try {
          await runtime.openTabId(tabId);
          opened = true;
        } catch (error) {
          console.error("Error opening tab", error);
        }
      }
      if (!opened) {
        await runtime.openUrl(url, newTab);
      }
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["history"] });
      }, 1000);
    },
    [runtime, newTab],
  );
}

export default function ExternalLink({
  href,
  newTab,
  tabId,
  children,
  className,
  rel,
}: ExternalLinkProps) {
  const openLink = useExternalLinkOpener(newTab);

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      openLink(href, tabId);
      event.preventDefault();
    },
    [tabId, openLink],
  );

  return (
    <a href={href} onClick={onClick} className={className} rel={rel}>
      {children}
    </a>
  );
}
