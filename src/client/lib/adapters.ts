
export function webOpenHistory(): void {
  window.open('http://localhost:8080/web-history.html');
}

export async function webGetCurrentUrl(): Promise<string> {
  return window.location.href;
}

export function chromeOpenHistory(): void {
  const url = 'chrome://history';
  chrome.tabs.query({ url }, (tab) => {
    if (tab?.[0]) {
      chrome.tabs.update(tab[0].id as number, { active: true }, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        }
      });
      return;
    }
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
    }
    chrome.tabs.create({ url }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      }
    });
  })
}

export function chromeGetCurrentUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.getCurrent((tab) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (tab?.url) {
        resolve(tab.url);
      } else {
        reject(new Error('No URL found.'));
      }
    });
  });
}
