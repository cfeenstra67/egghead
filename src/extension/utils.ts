import { HistoryCrawler } from './history-crawler';
import { NavigationObserver } from "./navigation-observer";
import { ServerInterface } from "../server";
import { TabObserver } from "./tab-observer";

export function setupObservers(server: ServerInterface): () => Promise<void> {
  const navigationObserver = new NavigationObserver("nav");
  const tabObserver = new TabObserver(server);
  const historyCrawler = new HistoryCrawler(
    server,
    "historyCrawler",
    24 * 60 * 60 * 1000
  );
  tabObserver.observeTabs(navigationObserver);
  tabObserver.registerCleanup("TabObserver_cleanup");
  navigationObserver.observeNavigation();
  navigationObserver.cleanUpStorage();
  historyCrawler.registerCrawler("HistoryCrawler_crawl");

  return async () => {
    await historyCrawler.resetState();
  };
}
