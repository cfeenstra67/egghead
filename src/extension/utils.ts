import { ExtensionMessage, ExtensionInterface } from './types';
import { NavigationObserver } from './navigation-observer';
import { ServerInterface } from '../server';
import { SessionObserver } from './session-observer';
import { TabObserver } from './tab-observer';

type MethodMapping = {
  [ExtensionMessage.Hello2]: ExtensionInterface["getHello"];
}

export function methodMapping(server: ExtensionInterface): MethodMapping {
  return {
    [ExtensionMessage.Hello2]: server.getHello.bind(server),
  };
}

export function cleanURL(uri: string): string {
    let cleanUri: string = uri;
    if (uri.indexOf("#") > 0) {
        cleanUri = uri.substring(0, uri.indexOf("#"));
    }
    return cleanUri;
}

export function setupSessionObservers(server: ServerInterface): void {
  const navigationObserver = new NavigationObserver('nav');
  const tabObserver = new TabObserver('tabs');
  const sessionObserver = new SessionObserver(server);
  sessionObserver.observeSessions(tabObserver);
  tabObserver.observeTabs(navigationObserver);
  navigationObserver.observeNavigation();
  navigationObserver.cleanUpStorage();
}
