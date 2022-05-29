
export function getTabById(
    tabId: number,
    callback: (tab: chrome.tabs.Tab) => void,
    pollInterval?: number,
    errorCallback?: (message: string) => void
): void {
    pollInterval = pollInterval || 100;

    const getTab = () => {
        chrome.tabs.get(tabId, (tab: chrome.tabs.Tab) => {
            if (chrome.runtime.lastError) {
                if (errorCallback) { errorCallback(chrome.runtime.lastError.message || ''); }
                setTimeout(getTab, pollInterval);
            } else {
                callback(tab);
            }
        })
    };

    getTab();
}

export function getWindowById(
    windowId: number,
    callback: (tab: chrome.windows.Window) => void,
    pollInterval?: number,
    errorCallback?: (message: string) => void
): void {
    pollInterval = pollInterval || 100;

    const getWindow = () => {
        chrome.windows.get(windowId, (win: chrome.windows.Window) => {
            if (chrome.runtime.lastError) {
                if (errorCallback) { errorCallback(chrome.runtime.lastError.message || ''); }
                setTimeout(getWindow, pollInterval);
            } else {
                callback(win);
            }
        })
    };

    getWindow();
}
