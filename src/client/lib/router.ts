import { useState, useMemo, useEffect } from "react";
import { AppRuntime } from "./types";

export type NavigationHook = (
  to: string,
  ...args: any[]
) => Promise<void> | void;

export type RouterHook = () => [string, NavigationHook];

export const historyUrl = "chrome://history";

const undefinedTabId = -1;

const defaultPath = "";

function findTabId(): Promise<number> {
  return new Promise((resolve, reject) => {
    chrome.tabs.getCurrent((tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (tab?.id === undefined) {
        reject(new Error("No tab ID found."));
        return;
      }
      resolve(tab.id);
    });
  });
}

function getCurrentExtensionPath(tabId: number): Promise<string> {
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
    });
  });
}

function setCurrentExtensionPath(tabId: number, path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, historyUrl).href;
    chrome.tabs.update(tabId, { url }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

function extensionNavigator(tabId: number): NavigationHook {
  return async (to) => {
    await setCurrentExtensionPath(tabId, to);
  };
}

export function useExtensionLocation(): [string, NavigationHook] {
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
    return () => {
      active = false;
    };
  }, [setTabId]);

  useEffect(() => {
    let active = true;

    async function load() {
      const currentPath = await getCurrentExtensionPath(tabId);
      if (!active) {
        return;
      }
      if (loc !== currentPath) {
        setLoc(currentPath);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [tabId, loc, setLoc]);

  const navigate = extensionNavigator(tabId);

  return [loc, navigate];
}

// returns the current hash location in a normalized form
// (excluding the leading '#' symbol)
function currentHashLocation() {
  return window.location.hash.replace(/^#/, "") || "/";
}

function hashNavigate(to: string): void {
  window.location.hash = to;
}

function useHashLocation(): [string, NavigationHook] {
  const [loc, setLoc] = useState(currentHashLocation());

  useEffect(() => {
    // this function is called whenever the hash changes
    const handler = () => setLoc(currentHashLocation());

    // subscribe to hash changes
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return [loc, hashNavigate];
}

export function getRouterHook(runtime: AppRuntime): RouterHook {
  switch (runtime) {
    case AppRuntime.Extension:
      return useExtensionLocation;
    case AppRuntime.Web:
      return useHashLocation;
  }
}
