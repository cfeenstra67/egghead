import { HistoryCrawler } from './history-crawler';
import { NavigationObserver } from "./navigation-observer";
import { ServerInterface } from "../server";
import { TabObserver } from "./tab-observer";

export function historyCrawlerFactory(server: ServerInterface): HistoryCrawler {
  return new HistoryCrawler(
    server,
    "historyCrawler",
    24 * 60 * 60 * 1000
  );
}

export interface ObserversController {
  resetState: () => Promise<void>;
  runCrawler: () => Promise<void>;
  maybeRunCrawler: () => Promise<void>;
}

export function setupObservers(server: ServerInterface): ObserversController {
  const navigationObserver = new NavigationObserver("nav");
  const tabObserver = new TabObserver(server);
  const historyCrawler = historyCrawlerFactory(server);
  tabObserver.observeTabs(navigationObserver);
  tabObserver.registerCleanup("TabObserver_cleanup");
  navigationObserver.observeNavigation();
  navigationObserver.cleanUpStorage();
  historyCrawler.registerCrawler("HistoryCrawler_crawl");

  return {
    resetState: async () => { await historyCrawler.resetState() },
    runCrawler: async () => { await historyCrawler.runCrawler() },
    maybeRunCrawler: async () => { await historyCrawler.runCrawler(true) },
  }
}
