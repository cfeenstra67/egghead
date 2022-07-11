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

export function useExternalLinkOpener(): (url: string, tabId?: number) => void {
  const { openTabId } = useContext(AppContext);

  return useCallback((url, tabId) => {
    if (tabId && openTabId) {
      openTabId(tabId);
    }
    window.open(url);
  }, [openTabId]);
}

export default function ExternalLink({
  href,
  newTab,
  tabId,
  children,
  className,
  rel,
}: ExternalLinkProps) {
  const props: any = {};

  const openLink = useExternalLinkOpener();

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
