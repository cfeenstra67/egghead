
export interface HistoryCrawlerState {
  startTimestamp: Date;
  upToDate: boolean;
}

export class HistoryCrawler {

  constructor(readonly ns: string, readonly interval: number) {}

  setState({ startTimestamp, upToDate }: HistoryCrawlerState): Promise<void> {
    return new Promise((resolve, reject) => {
      const storage = {
        [this.ns]: {
          startTimestamp: startTimestamp.getTime(),
          upToDate: upToDate
        }
      };
      chrome.storage.local.set(storage, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  getState(): Promise<HistoryCrawlerState> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(this.ns, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (result[this.ns]) {
          resolve({
            startTimestamp: new Date(result[this.ns].startTimestamp),
            upToDate: result[this.ns].upToDate,
          });
        } else {
          resolve({
            startTimestamp: new Date(0),
            upToDate: false,
          });
        }
      });
    });
  }

  private async crawlInterval(start: Date, end: Date): Promise<chrome.history.HistoryItem[]> {

    let interval = end.getTime() - start.getTime();

    const limit = 100;

    const out: chrome.history.HistoryItem[] = [];

    while (true) {
      const results: chrome.history.HistoryItem[] = await new Promise((resolve, reject) => {
        chrome.history.search({
          text: '',
          startTime: start.getTime(),
          endTime: start.getTime() + interval,
          maxResults: limit,
        });
      });

      if (results.length === limit) {
        interval /= 2;
      } else {
        for (const item of results) {
          out.push(item);
        }
        start = new Date(start.getTime() + )
        break;
      }
    }

    let step = 2;
    while (true) {
      const results: chrome.history.HistoryItem[] = await new Promise((resolve, reject) => {
        chrome.history.search({
          text: '',
          startTime: start.getTime() + interval * (step - 1),
          endTime: start.getTime() + interval * step,
          maxResults: limit,
        });
      });
      for (const item of results) {
        out.push(item);
      }
      if (!results.length) {
        break;
      }
      step += 1;
    }

    return out;
  }

  async crawl({ startTimestamp, upToDate }: HistoryCrawlerState): HistoryCrawlerState {
    const limit = 100;

    const items: chrome.history.HistoryItem[] = [];

    let endTimestamp = new Date(startTimestamp.getTime() + this.interval);

    const out: chrome.history.HistoryItem[] = [];

    while (endTimestamp.getTime() < startTimestamp.getTime()) {
      for (const item of await this.crawlInterval(startTimestamp, endTimestamp)) {
        out.push(item);
      }
      startTimestamp = new Date(startTimestamp.getTime() + this.interval);
      endTimestamp = new Date(endTimestamp.getTime() + this.interval);
    }

    console.log("OUT", out);
    return {
      startTimestamp: endTimestamp,
      upToDate: true,
    };
  }

}
