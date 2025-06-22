import { type PropsWithChildren, useEffect, useMemo, useState } from "react";
import { historyCrawlerFactory } from "../../extension/utils.js";
import type { ServerInterface } from "../../server";
import Layout from "./Layout.js";
import PopupLayout from "./PopupLayout.js";

interface LoadingStateProps {
  isPopup?: boolean;
  percentDone: number;
  lastError?: string;
}

function LoadingState({ isPopup, percentDone, lastError }: LoadingStateProps) {
  const UseLayout = isPopup
    ? PopupLayout
    : ({ children }: PropsWithChildren) => (
        <Layout searchDisabled>{children}</Layout>
      );

  return (
    <UseLayout>
      <div className="flex flex-1 overflow-hidden">
        {isPopup ? null : <div className="w-64 border-r bg-background" />}
        <main className="flex-1 overflow-hidden min-h-full p-4 space-y-4 text-base">
          {!isPopup && <h1 className="text-2xl font-semibold">Activity</h1>}
          {lastError === undefined ? (
            <>
              <p>
                Loading your existing browsing history for searching (this only
                happens once). This should only take a minute or two...
              </p>
              <p className="font-semibold text-lg">
                Percent done: {percentDone.toFixed(0)}%
              </p>
            </>
          ) : (
            <>
              <p>
                Unfortunately the app encountered an unrecoverable error while
                ingesting your existing browsing history. You{"'"}ll need to
                reinstall the extension to fix the issue. If you continue to
                experience issues, please report the following error to the
                developer at me@camfeenstra.com:
              </p>
              <p>{lastError}</p>
            </>
          )}
        </main>
      </div>
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
    chrome.runtime.sendMessage({ type: "maybeRestartCrawler" });
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

  const app = useMemo(() => (upToDate ? getApp() : <></>), [upToDate, getApp]);

  return upToDate ? (
    app
  ) : (
    <LoadingState
      percentDone={percentDone}
      isPopup={isPopup}
      lastError={lastError}
    />
  );
}
