import { ServerInterface } from "../server";

export interface HistoryCrawlerState {
  startTimestamp: Date;
  upToDate: boolean;
}

const initialDate = new Date("2020-01-01");

export class HistoryCrawler {

  constructor(
    readonly server: ServerInterface,
    readonly ns: string,
    readonly interval: number,
  ) {}

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
            startTimestamp: initialDate,
            upToDate: false,
          });
        }
      });
    });
  }

  private async crawlInterval(start: Date, end: Date): Promise<void> {
    console.log('crawling', start, end);
    const startInterval = end.getTime() - start.getTime();
    let interval = startInterval;
    let currentStart = start;

    const limit = 100;
    const intervalCutoff = 1000;

    const promises: Promise<void>[] = [];

    while (currentStart.getTime() < end.getTime()) {
      const results: chrome.history.HistoryItem[] = await new Promise((resolve, reject) => {
        const params = {
          text: '',
          startTime: currentStart.getTime(),
          endTime: currentStart.getTime() + interval,
          maxResults: limit,
        };
        chrome.history.search(params, (results) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(results);
          }
        });
      });

      // A little bit of safety here: to avoid an infinite loop, we handle
      // the (seemingly impossible, but who knows) case where there are >100
      // results in a single second. It doesn't seem like there's any good way to
      // handle this, so just bail and take the 100 we can get.
      if (results.length === limit) {
        interval /= 2;
        if (interval >= intervalCutoff) {
          continue;
        }
      }
      promises.push(this.handleItems(results));
      currentStart = new Date(currentStart.getTime() + interval);
      interval = Math.min(end.getTime() - currentStart.getTime(), startInterval);
    }

    await Promise.all(promises);
  }

  async crawl({ startTimestamp, upToDate }: HistoryCrawlerState, stop?: Date): Promise<HistoryCrawlerState> {
    if (stop === undefined) {
      stop = new Date();
    }

    let endTimestamp = new Date(startTimestamp.getTime() + this.interval);

    const promises: Promise<void>[] = [];

    while (endTimestamp.getTime() <= stop.getTime()) {
      promises.push(this.crawlInterval(startTimestamp, endTimestamp));
      startTimestamp = new Date(startTimestamp.getTime() + this.interval);
      endTimestamp = new Date(endTimestamp.getTime() + this.interval);
    }

    await Promise.all(promises);

    return {
      startTimestamp: stop,
      upToDate: true,
    };
  }

  async handleItems(items: chrome.history.HistoryItem[]): Promise<void> {
    console.log("OUT", items);
  }

  async runCrawler() {
    const state = await this.getState();
    const newState = await this.crawl(state);
    await this.setState(newState);
  }

  registerCrawler(crawlerAlarm: string): void {
    this.setState({ startTimestamp: initialDate, upToDate: false })
      .then(this.runCrawler.bind(this));
    // chrome.alarms.create(crawlerAlarm, {
    //   delayInMinutes: 0,
    //   periodInMinutes: 1,
    // });
    // chrome.alarms.onAlarm.addListener(async (alarm) => {
    //   if (alarm.name !== crawlerAlarm) {
    //     return;
    //   }
    //   // Reset state on each run for now
    //   await this.setState({ startTimestamp: initialDate, upToDate: false });
    //   await this.runCrawler();
    // });
  }

}
