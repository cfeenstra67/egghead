import { useState, useEffect, useMemo } from 'react';
import Card from './Card';
import { historyCrawlerFactory } from '../../extension/utils';
import Layout from './Layout';
import PopupLayout from './PopupLayout';
import type { ServerInterface } from '../../server';

interface LoadingStateProps {
  isPopup?: boolean;
  percentDone: number;
  lastError?: string;
}

function LoadingState({ isPopup, percentDone, lastError }: LoadingStateProps) {
  const UseLayout = isPopup ? PopupLayout : Layout;

  return (
    <UseLayout>
      {!isPopup && <h1>History</h1>}
      <Card>
        {lastError === undefined ? (
          <>
            <p>
              Loading your existing browsing history for searching
              (this only happens once). This should only take a minute
              or two...
            </p>
            <p>
              Percent done: {percentDone.toFixed(0)}%
            </p>
          </>
        ) : (
          <>
            <p>
              Unfortunately the app encountered an unrecoverable error
              while ingesting your existing browsing history. You{"'"}ll
              need to reinstall the extension to fix the issue. If you
              continue to experience issues, please report the following
              error to the developer at me@camfeenstra.com:
            </p>
            <p>{lastError}</p>
          </>
        )}
      </Card>
    </UseLayout>
  );
}

export interface InitialCrawlProps {
  serverClientFactory: () => Promise<ServerInterface>;
  getApp: () => React.ReactElement;
  isPopup?: boolean;
}

export default function InitialCrawl({
  serverClientFactory,
  getApp,
  isPopup,
}: InitialCrawlProps) {

  const [upToDate, setUpToDate] = useState(false);
  const [percentDone, setPercentDone] = useState(0);
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  async function checkIfUpToDate() {
    const server = await serverClientFactory();
    chrome.runtime.sendMessage({ type: 'maybeRestartCrawler' });
    const crawler = historyCrawlerFactory(server);
    const currentState = await crawler.getState();
    setUpToDate(currentState.upToDate);
    setPercentDone(currentState.initialCrawlPercentDone ?? 0);
    setLastError(currentState.lastError);
  }

  useEffect(() => {
    if (upToDate) {
      return;
    }

    checkIfUpToDate();
    const ivl = setInterval(checkIfUpToDate, 500);

    return () => clearInterval(ivl);
  }, [upToDate]);

  const app = useMemo(() => upToDate ? getApp() : <></>, [upToDate, getApp]);

  return upToDate ? app : (
    <LoadingState
      percentDone={percentDone}
      isPopup={isPopup}
      lastError={lastError}
    />
  );
}
