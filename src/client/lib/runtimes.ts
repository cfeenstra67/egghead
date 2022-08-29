import { RouterHook, useExtensionLocation, useHashLocation, popupLocationHook } from './router';

export interface RuntimeInterface {

  routerHook: RouterHook;

  openHistory(): Promise<void>;

  getCurrentUrl(): Promise<string>;

  openUrl(url: string, newTab?: boolean): Promise<void>;

  openTabId?: (tabId: number) => Promise<void>;

  goBack(): Promise<void>;

}

export class WebRuntime implements RuntimeInterface {

  routerHook = useHashLocation;

  async openHistory() {
    window.open('http://localhost:8080/history.html');
  }

  async getCurrentUrl() {
    return window.location.href;
  }

  async openUrl(url: string, newTab?: boolean) {
    if (newTab) {
      window.open(url);
    } else {
      window.location.href = url;
    }
  }

  async goBack() {
    history.back();
  }

}

export class ChromeEmbeddedRuntime implements RuntimeInterface {

  constructor(private readonly tabId: number) {}

  routerHook = useExtensionLocation;

  private getCurrentTab(): Promise<chrome.tabs.Tab> {
    return new Promise((resolve, reject) => {
      chrome.tabs.get(this.tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(tab);
        }
      })
    });
  }

  openHistory() {
    return new Promise<void>((resolve, reject) => {
      chrome.tabs.create({ url: 'chrome://history' }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(undefined);
        }
      });
    })
  }

  async getCurrentUrl() {
    const tab = await this.getCurrentTab();
    return tab.url ?? 'about:blank';
  }

  async openUrl(url: string, newTab?: boolean) {
    if (newTab) {
      await new Promise((resolve, reject) => {
        chrome.tabs.create({ url }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(undefined);
          }
        })
      });
    } else {
      const currentTab = await this.getCurrentTab();
      await Promise.all([
        new Promise((resolve, reject) => {
          chrome.tabs.update(this.tabId, { url }, (tab) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (tab) {
              resolve(tab.windowId);
            } else {
              reject(new Error('unexpected error updating tab'));
            }
          });
        }),
        new Promise((resolve, reject) => {
          chrome.windows.update(currentTab.windowId, { focused: true }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(undefined);
            }
          });
        }),
      ]);
    }
  }

  async openTabId(tabId: number) {
    chrome.tabs.update(tabId, { active: true });
  }

  async goBack() {
    await this.openUrl('chrome://history');
  }

}

export class PopupRuntime implements RuntimeInterface {

  routerHook: RouterHook;

  constructor(private readonly historyUrl: string) {
    this.routerHook = popupLocationHook(this, historyUrl);
  }

  openHistory() {
    return new Promise<void>((resolve, reject) => {
      chrome.tabs.create({ url: this.historyUrl }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(undefined);
        }
      });
    })
  }

  private getCurrentTab(): Promise<chrome.tabs.Tab> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (tabs[0]) {
          resolve(tabs[0]);
        } else {
          reject(new Error('No active tab'));
        }
      })
    });
  }

  async getCurrentUrl() {
    const tab = await this.getCurrentTab();
    return tab.url ?? 'about:blank';
  }

  async openUrl(url: string, newTab?: boolean) {
    if (newTab) {
      await new Promise((resolve, reject) => {
        chrome.tabs.create({ url }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(undefined);
          }
        })
      });
    } else {
      const currentTab = await this.getCurrentTab();
      await Promise.all([
        new Promise((resolve, reject) => {
          chrome.tabs.update(currentTab.id as number, { url }, (tab) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (tab) {
              resolve(tab.windowId);
            } else {
              reject(new Error('unexpected error updating tab'));
            }
          });
        }),
        new Promise((resolve, reject) => {
          chrome.windows.update(currentTab.windowId, { focused: true }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(undefined);
            }
          });
        }),
      ]);
    }
  }

  async openTabId(tabId: number) {
    chrome.tabs.update(tabId, { active: true });
  }

  async goBack() {
    await this.openUrl(this.historyUrl);
  }

}
