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

export default function ExternalLink({
  href,
  newTab,
  tabId,
  children,
  className,
  rel,
}: ExternalLinkProps) {
  const props: any = {};

  const { openTabId } = useContext(AppContext);

  const onClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (tabId && openTabId) {
      openTabId(tabId);
      event.preventDefault();
    }
  }, [tabId, openTabId]);

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
