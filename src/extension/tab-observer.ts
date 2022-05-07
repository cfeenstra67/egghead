import EventTarget from '@ungap/event-target';
import { v4 as uuidv4 } from 'uuid';
import { getTabById, getWindowById } from './chrome-utils';
import { NavigationObserver } from './navigation-observer';
import { TabSession } from './types';
import { cleanURL } from './utils'

function newSessionFromTab(tab: chrome.tabs.Tab): TabSession {
  return {
    id: uuidv4(),
    tabId: tab.id as number,
    url: tab.url && cleanURL(tab.url),
    rawUrl: tab.url,
    title: tab.title,
    startedAt: new Date(),
  };
}

function updateSessionFromTab(session: TabSession, tab: chrome.tabs.Tab): TabSession {
  return {
    ...session,
    url: tab.url && cleanURL(tab.url),
    rawUrl: tab.url,
    title: tab.title,
  };
}

function sessionsToJson(tabMap: Record<number, TabSession>): Record<string, any> {
  const out: Record<string, any> = {};
  Object.entries(tabMap).forEach(([key, value]) => {
    out[key.toString()] = {
      ...value,
      startedAt: value.startedAt.getTime(),
      endedAt: value.endedAt?.getTime(),
    }
  });
  return out;
}

function jsonToSessions(json: Record<string, any>): Record<number, TabSession> {
  const out: Record<number, TabSession> = {};
  Object.entries(json).forEach(([key, value]) => {
    out[parseInt(key)] = {
      ...value,
      startedAt: new Date(value.startedAt),
      endedAt: value.endedAt && new Date(value.endedAt),
    }
  });
  return out;
}

export class TabObserver {

    private tabMap: Record<number, TabSession>;
    private target: EventTarget;

    constructor(public storageName: string) {
      this.tabMap = {};
      this.target = new EventTarget();
    }

    saveState(callback?: () => void) {
      const obj = { [this.storageName]: sessionsToJson(this.tabMap) };
      chrome.storage.local.set(obj, callback);
    }

    loadState(callback: () => void) {
      chrome.storage.local.get([this.storageName], (result: any) => {
        this.tabMap = this.tabMap ?? {};
        if (result[this.storageName]) {
          this.tabMap = jsonToSessions(result[this.storageName]);
        }
        callback();
      });
    }

    observeTabs(navigationObserver: NavigationObserver): void {
      navigationObserver.onNavigationComplete(this.handleNavigationComplete.bind(this));
      navigationObserver.onNavigationError(this.handleNavigationError.bind(this));
      chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
      chrome.tabs.onUpdated.addListener(this.handleTabMovedGroups.bind(this));
      chrome.tabs.onAttached.addListener(this.handleTabMovedWindow.bind(this));
      chrome.tabs.onCreated.addListener(this.handleTabCreated.bind(this));
    }

    emitSessionStartedEvent(session: TabSession, oldSession?: TabSession, transitionType?: string): void  {
      let detail: TabObserver.SessionStartedEvent = { detail: { session, oldSession, transitionType } };
      let event = new CustomEvent(TabObserver.EventType.VISIT_STARTED, detail);
      this.target.dispatchEvent(event);
    }

    emitSessionEndedEvent(session: TabSession, newSession?: TabSession, transitionType?: string): void {
      session.endedAt = new Date();
      let detail: TabObserver.SessionEndedEvent = { detail: { session, newSession, transitionType } };
      let event = new CustomEvent(TabObserver.EventType.VISIT_ENDED, detail);
      this.target.dispatchEvent(event);
    }

    handleNavigationComplete(event: NavigationObserver.NavigationEvent): void {
      if (event.detail.frameId !== 0) {
        return;
      }

      this.loadState(() => {
        // Check if we already have a visit for this tab
        let tabId = event.detail.tabId as number;
        if (!this.tabMap[tabId]) {
          getTabById(tabId, (tab: chrome.tabs.Tab) => {
            const newSession = newSessionFromTab(tab);
            this.tabMap[tabId] = newSession;
            this.saveState(() => {
              // Handle the case where a link was opened in a new tab
              if (this.tabMap[event.detail.source.tabId || -1]) {
                let current: TabSession = this.tabMap[event.detail.source.tabId as number];
                this.emitSessionStartedEvent(newSession, current, event.detail.transitionType);
              } else {
                this.emitSessionStartedEvent(newSession);
              }
            });
          });
        } else {
          const current: TabSession = this.tabMap[tabId];
          const newUrl = cleanURL(event.detail.url);
          if (current.url === newUrl) {
            return;
          }
          getTabById(tabId, (tab: chrome.tabs.Tab) => {
            const newSession = newSessionFromTab(tab);
            this.tabMap[tabId] = newSession;
            this.saveState(() => {
              this.emitSessionStartedEvent(newSession, current, event.detail.transitionType);
              this.emitSessionEndedEvent(current, newSession, event.detail.transitionType);
            });
          });
        }
      });
    }

    handleNavigationError(event: NavigationObserver.NavigationEvent): void {
      if (event.detail.frameId !== 0) {
        return;
      }

      console.warn("Navigation error:", event.detail);
    }

    handleTabRemoved(tabId: number, removeInfo: chrome.tabs.TabRemoveInfo): void {
      this.loadState(() => {
        if (!this.tabMap[tabId]) {
          return;
        }
        const session: TabSession = this.tabMap[tabId];
        delete this.tabMap[tabId];
        this.saveState(() => {
          this.emitSessionEndedEvent(session);
        })
      });
    }

    handleTabCreated(tab: chrome.tabs.Tab): void {
      if (tab.id === undefined) {
        return;
      }
      console.log('Tab created:', tab.id);
    }

    handleTabMovedGroups(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
      if (changeInfo.groupId == undefined) {
        return
      }
      console.log("Tab moved groups: ", tabId, changeInfo)
    }

    handleTabMovedWindow(tabId: number, attachInfo: chrome.tabs.TabAttachInfo): void {
      console.log("Tab moved windows: ", tabId, attachInfo.newWindowId)
    }

    onSessionStarted(handler: (event: TabObserver.SessionStartedEvent) => void): void {
      this.target.addEventListener(
        TabObserver.EventType.VISIT_STARTED,
        (evt: any) => handler(evt as TabObserver.SessionStartedEvent)
      )
    }

    onSessionEnded(handler: (event: TabObserver.SessionEndedEvent) => void): void {
      this.target.addEventListener(
        TabObserver.EventType.VISIT_ENDED,
        (evt: any) => handler(evt as TabObserver.SessionEndedEvent)
      )
    }

}

export namespace TabObserver {

  export enum EventType {
    VISIT_STARTED = "visit_started",
    VISIT_ENDED = "visit_ended",
    VISIT_DURING = "visit_during",
    SELECTED_TEXT = "selected_text"
  }

  export interface SessionStartedEvent {
    detail: {
      session: TabSession,
      oldSession?: TabSession,
      transitionType?: string
    }
  }

  export interface SessionEndedEvent {
    detail: {
      session: TabSession,
      newSession?: TabSession,
      transitionType?: string
    }
  }

}
