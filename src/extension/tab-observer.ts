import { getTabById } from "./chrome-utils";
import { Session } from "../models";
import { NavigationObserver } from "./navigation-observer";
import { ServerInterface, TabChangedRequest } from "../server";
import { dslToClause } from "../server/clause";

interface TabStateDiff {
  updates: Omit<TabChangedRequest, "type">[];
  deletes: number[];
}

interface TabChangedRequestFromTabArgs {
  tab: chrome.tabs.Tab;
  sourceTabId?: number;
  transitionType?: string;
}

function tabChangedRequestFromTab({
  tab,
  sourceTabId,
  transitionType,
}: TabChangedRequestFromTabArgs): TabChangedRequest {
  return {
    tabId: tab.id as number,
    url: tab.url as string,
    title: tab.title as string,
    sourceTabId,
    transitionType,
  };
}

export class TabObserver {
  constructor(readonly server: ServerInterface) {}

  observeTabs(navigationObserver: NavigationObserver): void {
    navigationObserver.onNavigationComplete(
      this.handleNavigationComplete.bind(this)
    );
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
  }

  registerCleanup(cleanupAlarm: string): void {
    chrome.alarms.create(cleanupAlarm, { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name !== cleanupAlarm) {
        return;
      }
      await this.cleanupSessions();
    });
    // Run once now, on initial registration
    this.cleanupSessions();
  }

  handleNavigationComplete(event: NavigationObserver.NavigationEvent): void {
    if (event.detail.frameId !== 0) {
      return;
    }

    getTabById(event.detail.tabId as number, async (tab) => {
      const response = await this.server.tabChanged(
        tabChangedRequestFromTab({
          tab,
          sourceTabId: event.detail.source.tabId ?? undefined,
          transitionType: event.detail.transitionType,
        })
      );
      console.log("Tab changed", response);
    });
  }

  async handleTabRemoved(
    tabId: number,
    removeInfo: chrome.tabs.TabRemoveInfo
  ): Promise<void> {
    const response = await this.server.tabClosed({ tabId });
    console.log("Tab closed", response);
  }

  async cleanupSessions(): Promise<void> {
    const diff = await this.diffCurrentState();
    console.log(
      `Cleaning up ${diff.deletes.length} tab(s): ${diff.deletes}; ` +
        `${diff.updates.length} tab(s) open.`
    );
    await Promise.all(
      diff.updates.map(async (update) => {
        await this.server.tabChanged(update);
      }).concat(diff.deletes.map(async (tabId) => {
        await this.server.tabClosed({ tabId });
      }))
    );
  }

  diffCurrentState(): Promise<TabStateDiff> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ status: "complete" }, async (tabs) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        const { results } = await this.server.querySessions({
          filter: dslToClause<Session>({
            endedAt: null,
          }),
        });
        const updates: TabStateDiff["updates"] = [];

        const currentActiveSessionTabIds = new Set(
          results.map((session) => session.tabId)
        );

        tabs.forEach((tab) => {
          if (tab.id === undefined) {
            console.error(`Tab has no ID: ${tab}`);
            return;
          }
          currentActiveSessionTabIds.delete(tab.id);
          updates.push(tabChangedRequestFromTab({ tab }));
        });

        resolve({
          updates,
          deletes: [...currentActiveSessionTabIds],
        });
      });
    });
  }
}
