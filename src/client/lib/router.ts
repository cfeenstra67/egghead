import { useState, useMemo, useEffect } from 'react';

export const historyUrl = 'chrome://history';

const historyPattern = `${historyUrl}/*`;

const undefinedTabId = -1;

const defaultPath = '';

function findTabId(): Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.tabs.getCurrent((tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (tab?.id === undefined) {
        reject(new Error('No tab ID found.'));
        return;
      }
      resolve(tab.id);
    })
  });
}

function getCurrentPath(tabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (tabId === undefinedTabId) {
      resolve(defaultPath);
      return;
    }
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (tab.url === undefined) {
        resolve(defaultPath);
        return;
      }
      const url = new URL(tab.url);
      resolve(url.pathname);
    })
  });
}

function setCurrentPath(tabId: number, path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `${historyUrl}${path}`
    chrome.tabs.update(tabId, { url }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

type NavigationHook = (to: string, ...args: any[]) => Promise<void>;

function navigator(tabId: number): NavigationHook {
  return async (to) => {
    await setCurrentPath(tabId, to);
  };
}

export function useHistoryLocation(): [string, NavigationHook] {
  const [tabId, setTabId] = useState(undefinedTabId);
  const [loc, setLoc] = useState(defaultPath);

  useMemo(() => {
    let active = true;

    async function load() {
      const currentTabId = await findTabId();
      if (!active) {
        return;
      }
      setTabId(currentTabId);
    }

    load();
    return () => { active = false };
  }, [setTabId]);

  useEffect(() => {
    let active = true;

    async function load() {
      const currentPath = await getCurrentPath(tabId);
      if (!active) {
        return;
      }
      if (loc !== currentPath) {
        setLoc(currentPath);
      }
    }

    load();
    return () => { active = false; };
  }, [tabId, loc, setLoc])

  const navigate = navigator(tabId);

  return [loc, navigate];
}
