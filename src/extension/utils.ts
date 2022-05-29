import { NavigationObserver } from "./navigation-observer";
import { ServerInterface } from "../server";
import { TabObserver } from "./tab-observer";

export function setupObservers(server: ServerInterface): void {
  const navigationObserver = new NavigationObserver("nav");
  const tabObserver = new TabObserver(server);
  tabObserver.observeTabs(navigationObserver);
  tabObserver.registerCleanup("TabObserver_cleanup");
  navigationObserver.observeNavigation();
  navigationObserver.cleanUpStorage();
}
