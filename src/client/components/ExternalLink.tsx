import { useCallback, useContext } from "react";
import { AppContext } from "../lib/context";

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

  return useCallback(
    (url, tabId) => {
      if (newTab && tabId && runtime.openTabId) {
        runtime.openTabId(tabId);
      } else {
        runtime.openUrl(url, newTab);
      }
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
