import { useState, useEffect, useMemo } from 'react';
import Card from './Card';
import { historyCrawlerFactory } from '../../extension/utils';
import Layout from './Layout';
import PopupLayout from './PopupLayout';
import type { ServerInterface } from '../../server';

interface LoadingStateProps {
  isPopup?: boolean;
}

function LoadingState({ isPopup }: LoadingStateProps) {
  const UseLayout = isPopup ? PopupLayout : Layout;

  return (
    <UseLayout>
      {!isPopup && <h1>History</h1>}
      <Card>
        <p>
          Loading your existing chrome history for searching
          (this only happens once). This should only take a minute
          or two...
        </p>
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

  async function checkIfUpToDate() {
    const server = await serverClientFactory();
    const crawler = historyCrawlerFactory(server);
    const currentState = await crawler.getState();
    setUpToDate(currentState.upToDate);
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

  return upToDate ? app : <LoadingState isPopup={isPopup} />;
}
