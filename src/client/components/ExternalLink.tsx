import { useContext, useCallback } from 'react';
import { AppContext } from '../lib/context';

export interface ExternalLinkProps {
  href: string;
  newTab?: boolean;
  tabId?: number;
  children?: React.ReactNode;
  className?: string;
  rel?: string;
}

export function useExternalLinkOpener(newTab?: boolean): (url: string, tabId?: number) => void {
  const { openTabId } = useContext(AppContext);

  return useCallback((url, tabId) => {
    if (!newTab) {
      window.location.href = url;
      return;
    }

    if (tabId && openTabId) {
      openTabId(tabId);
    }
    window.open(url);
  }, [openTabId, newTab]);
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

  const onClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    openLink(href, tabId);
    event.preventDefault();
  }, [tabId, openLink]);

  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      rel={rel}
      {...(newTab ? {target: '_blank'} : {})}
    >
      {children}
    </a>
  );
}
