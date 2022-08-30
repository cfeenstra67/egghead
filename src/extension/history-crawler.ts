import parentLogger from '../logger';
import { ServerInterface, GhostSession } from "../server";
import { AggregateOperator, BinaryOperator } from "../server/clause";
import { cleanURL, dateToSqliteString } from "../server/utils";

// Chrome appears to only store 3 months' worth of history, so setting
// this any earlier than that isn't useful and misleads the user on the
// progress of the initial load.
const initialDate = new Date(
  new Date().getTime() - 100 * 24 * 60 * 60 * 1000
);

const logger = parentLogger.child({ context: 'history-crawler' });

interface Visit {
  visitItem: chrome.history.VisitItem;
  historyItem: chrome.history.HistoryItem;
}

export interface HistoryCrawlerState {
  startTimestamp: Date;
  upToDate: boolean;
  initialCrawlPercentDone?: number;
  lastError?: string;
}

export interface HistoryCrawlStats {
  initialCorrelated: number;
  initialUncorrelated: number;
  finalCorrelated: number;
  finalUncorrelated: number;
  uncorrelatedVisits: Visit[];
}

function aggregateStatsBinary(left: HistoryCrawlStats, right: HistoryCrawlStats): HistoryCrawlStats {
  return {
    initialUncorrelated: left.initialUncorrelated + right.initialUncorrelated,
    initialCorrelated: left.initialCorrelated + right.initialCorrelated,
    finalUncorrelated: left.finalUncorrelated + right.finalUncorrelated,
    finalCorrelated: left.finalCorrelated + right.finalCorrelated,
    uncorrelatedVisits: left.uncorrelatedVisits.concat(right.uncorrelatedVisits),
  };
}

const emptyCrawlStats: HistoryCrawlStats = {
  initialCorrelated: 0,
  initialUncorrelated: 0,
  finalCorrelated: 0,
  finalUncorrelated: 0,
  uncorrelatedVisits: [],
};

function aggregateStats(stats: HistoryCrawlStats[]): HistoryCrawlStats {
  if (stats.length === 0) {
    return emptyCrawlStats;
  }
  return stats.reduce(aggregateStatsBinary);
}

export class HistoryCrawler {

  constructor(
    readonly server: ServerInterface,
    readonly ns: string,
    readonly interval: number,
  ) {}

  setState({ startTimestamp, upToDate, initialCrawlPercentDone, lastError }: HistoryCrawlerState): Promise<void> {
    return new Promise((resolve, reject) => {
      const storage = {
        [this.ns]: {
          startTimestamp: startTimestamp.getTime(),
          upToDate: upToDate,
          initialCrawlPercentDone,
          lastError,
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
            initialCrawlPercentDone: result[this.ns].initialCrawlPercentDone,
            upToDate: result[this.ns].upToDate,
          });
        } else {
          resolve({
            startTimestamp: initialDate,
            initialCrawlPercentDone: 0,
            upToDate: false,
          });
        }
      });
    });
  }

  resetState(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove([this.ns], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async patchState(mapper: (state: HistoryCrawlerState) => HistoryCrawlerState): Promise<void> {
    return await this.setState(mapper(await this.getState()));
  }

  private deduplicateSessions(sessions: GhostSession[]): GhostSession[] {
    const sessionsByUrl: Record<string, GhostSession[]> = {};
    const cutoff = 5 * 60 * 1000;
    for (const session of sessions) {
      const cleanUrl = cleanURL(session.url);
      if (sessionsByUrl[cleanUrl] === undefined) {
        sessionsByUrl[cleanUrl] = [session];
        continue;
      }
      const matchingSessions = sessionsByUrl[cleanUrl].filter((otherSession) => {
        const diff = Math.abs(session.visitTime - otherSession.visitTime);
        return diff < cutoff;
      });
      if (matchingSessions.length > 0) {
        continue;
      }
      sessionsByUrl[cleanUrl].push(session);
    }
    const out: GhostSession[] = [];
    for (const sessions of Object.values(sessionsByUrl)) {
      for (const session of sessions) {
        out.push(session);
      }
    }
    return out;
  }

  async handleItems(items: Visit[]): Promise<HistoryCrawlStats> {
    const timestamps = items.flatMap((item) => {
      return item.visitItem.visitTime ? [item.visitItem.visitTime] : [];
    });
    const cushion = 60 * 1000;
    const minTimestamp = Math.min(...timestamps) - cushion;
    const maxTimestamp = Math.max(...timestamps) + cushion;
    const urls = new Set(items.flatMap((item) => {
      return item.historyItem.url ? [cleanURL(item.historyItem.url)] : [];
    }));
    const visitIds = items.map((item) => item.visitItem.visitId);

    const { results } = await this.server.querySessions({
      filter: {
        operator: AggregateOperator.Or,
        clauses: [
          {
            operator: AggregateOperator.And,
            clauses: [
              {
                operator: BinaryOperator.GreaterThanOrEqualTo,
                fieldName: 'startedAt',
                value: dateToSqliteString(new Date(minTimestamp)),
              },
              {
                operator: BinaryOperator.LessthanOrEqualTo,
                fieldName: 'startedAt',
                value: dateToSqliteString(new Date(maxTimestamp)),
              },
              {
                operator: BinaryOperator.In,
                fieldName: 'url',
                value: Array.from(urls),
              },
              {
                operator: BinaryOperator.Equals,
                fieldName: 'chromeVisitId',
                value: null,
              }
            ]
          },
          {
            operator: BinaryOperator.In,
            fieldName: 'chromeVisitId',
            value: visitIds,
          },
        ]
      },
    });

    const correlatedVisitIds = new Set(results.flatMap((session) => {
      return session.chromeVisitId ? [session.chromeVisitId] : [];
    }));

    const itemsByUrl = Object.fromEntries(items.flatMap((item) => {
      if (!item.historyItem.url) {
        return [];
      }
      if (correlatedVisitIds.has(item.visitItem.visitId)) {
        return [];
      }
      return [[item.historyItem.url, item]];
    }));

    const correlations: Record<string, [string, string | undefined, string | undefined]> = {};

    results.forEach((session) => {
      if (session.chromeVisitId) {
        return;
      }
      if (itemsByUrl[session.url]) {
        correlations[session.id] = [
          itemsByUrl[session.url].visitItem.visitId,
          itemsByUrl[session.url].visitItem.referringVisitId,
          itemsByUrl[session.url].visitItem.transition,
        ];
      }
    });

    const correlatedIds = new Set(
      Object.values(correlations).map(([visitId, _1]) => visitId)
    );
    const nonCorrelated = new Set(
      items
        .map((item) => item.visitItem.visitId)
        .filter((itemId) => !correlatedVisitIds.has(itemId))
        .filter((itemId) => !correlatedIds.has(itemId))
    );

    for (const [sessionId, [visitId, referringVisitId, transition]] of Object.entries(correlations)) {
      await this.server.correlateChromeVisit({
        sessionId,
        visitId,
        referringVisitId,
        transition,
      });
    }

    const uncorrelatedVisits = items.filter(
      (item) => nonCorrelated.has(item.visitItem.visitId)
    );

    const sessionsWithDupes = uncorrelatedVisits.map((visit) => ({
      visitTime: visit.visitItem.visitTime ?? 0,
      visitId: visit.visitItem.visitId,
      title: visit.historyItem.title ?? '',
      url: visit.historyItem.url ?? '',
      referringVisitId: visit.visitItem.referringVisitId,
      transition: visit.visitItem.transition,
    }));
    const sessions = this.deduplicateSessions(sessionsWithDupes);
    const removedDupes = sessionsWithDupes.length - sessions.length;
    logger.debug(`Removed ${removedDupes} duplicate sessions`);
    await this.server.createGhostSessions({ sessions });

    return {
      initialUncorrelated: Object.keys(itemsByUrl).length,
      initialCorrelated: correlatedVisitIds.size,
      finalUncorrelated: nonCorrelated.size,
      finalCorrelated: correlatedIds.size + correlatedVisitIds.size,
      uncorrelatedVisits,
    };
  }

  private async getVisitsForItem(
    historyItem: chrome.history.HistoryItem,
    start: Date,
    end: Date,
    getVisits: (url: string) => Promise<chrome.history.VisitItem[]>,
  ): Promise<Visit[]> {
    if (!historyItem.url) {
      return [];
    }
    const visits = await getVisits(historyItem.url as string);
    const useVisits = visits.filter((visit) => (
      visit.visitTime &&
      visit.visitTime >= start.getTime() &&
      visit.visitTime < end.getTime()
    ));
    return useVisits.map((visitItem) => ({ visitItem, historyItem }));
  }

  private async crawlInterval(
    start: Date,
    end: Date,
    getVisits: (url: string) => Promise<chrome.history.VisitItem[]>,
  ): Promise<HistoryCrawlStats> {
    const startInterval = end.getTime() - start.getTime();
    let interval = startInterval;
    let currentStart = start;

    // Chrome appears to let us pass any number here, rather than capping it
    // at the default limit of 100 or anything like that.
    const limit = 1000;
    const intervalCutoff = 1000;

    const visitItems: Visit[] = [];

    while (currentStart.getTime() < end.getTime()) {
      const currentEnd = new Date(currentStart.getTime() + interval);
      const results: chrome.history.HistoryItem[] = await new Promise((resolve, reject) => {
        const params = {
          text: '',
          startTime: currentStart.getTime(),
          endTime: currentEnd.getTime(),
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
      // the (seemingly impossible, but who knows) case where there are >1000
      // results in a single second. It doesn't seem like there's any good way to
      // handle this, so just bail and take the 1000 we can get.
      if (results.length === limit) {
        interval /= 2;
        if (interval >= intervalCutoff) {
          continue;
        }
      }
      if (results.length > 0) {
        const visitArrays = await Promise.all(results.map((historyItem) => (
          this.getVisitsForItem(historyItem, currentStart, currentEnd, getVisits)
        )));
        const newVisitItems = visitArrays.reduce((a, b) => a.concat(b));
        for (const item of newVisitItems) {
          visitItems.push(item);
        }
      }
      currentStart = new Date(currentStart.getTime() + interval);
      interval = Math.min(end.getTime() - currentStart.getTime(), startInterval);
    }

    if (visitItems.length > 0) {
      return this.handleItems(visitItems);
    }
    return emptyCrawlStats;
  }

  private getVisitsCache(): (url: string) => Promise<chrome.history.VisitItem[]> {
    const visits: Record<string, chrome.history.VisitItem[]> = {};
    async function getVisits(url: string): Promise<chrome.history.VisitItem[]> {
      if (!visits[url]) {
        visits[url] = await new Promise((resolve, reject) => {
          chrome.history.getVisits({ url }, (results) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(results);
            }
          });
        });
      }
      return visits[url];
    }
    return getVisits;
  }

  async *crawl({ startTimestamp, upToDate, initialCrawlPercentDone }: HistoryCrawlerState, stop?: Date): AsyncGenerator<(state: HistoryCrawlerState) => HistoryCrawlerState> {
    if (stop === undefined) {
      stop = new Date();
    }
    const now = new Date();
    const initialPercent = initialCrawlPercentDone ?? 0;

    // Add interval cushion before the start timestamp
    startTimestamp = new Date(
      Math.max(startTimestamp.getTime() - this.interval, 0)
    );
    logger.info('crawling from %s to %s', startTimestamp, stop);

    let endTimestamp = new Date(startTimestamp.getTime() + this.interval);

    const promises: [Promise<HistoryCrawlStats>, Date][] = [];

    const getVisits = this.getVisitsCache();

    let total = 0;
    let done = 0;
    const correlateVisitsPercent = 25;
    const nonCorrelateVisitsPercent = 100 - correlateVisitsPercent;

    while (endTimestamp.getTime() <= stop.getTime()) {
      total += 1;
      const crawlPromise = this.crawlInterval(startTimestamp, endTimestamp, getVisits)
        .then(async (result) => {
          if (upToDate) {
            return result;
          }
          done += 1;
          const percentDone = done / total * nonCorrelateVisitsPercent;
          await this.patchState((state) => ({
            ...state,
            initialCrawlPercentDone: Math.max(percentDone, initialPercent)
          }));
          return result;
        });

      promises.push(

      );
      startTimestamp = new Date(startTimestamp.getTime() + this.interval);
      endTimestamp = new Date(endTimestamp.getTime() + this.interval);
      promises.push([crawlPromise, startTimestamp]);
    }

    const stats: HistoryCrawlStats[] = [];
    for (const [promise, newStartTimestamp] of promises) {
      stats.push(await promise);
      yield (state) => ({
        ...state,
        startTimestamp: newStartTimestamp,
      });
    }

    let ticks = 0;
    const ivl = setInterval(async () => {
      if (upToDate) {
        return;
      }
      ticks += 1;
      const effectiveTicks = Math.min(ticks, correlateVisitsPercent - 1);

      await this.patchState((state) => ({
        ...state,
        initialCrawlPercentDone: Math.max(
          nonCorrelateVisitsPercent + effectiveTicks,
          initialPercent
        )
      }));
    }, 1000);

    await this.server.fixChromeParents({}).finally(() => clearInterval(ivl));

    const aggStats = aggregateStats(stats);

    const elapsed = new Date().getTime() - now.getTime();

    logger.info('elapsed %s, crawl stats %o', elapsed / 1000, aggStats);

    const finalState = {
      startTimestamp: stop,
      upToDate: true,
    };
    yield () => finalState;
  }

  async runCrawler(ifAvailable?: boolean) {
    await navigator.locks.request(this.ns, { ifAvailable }, async (lock) => {
      if (lock === null) {
        logger.debug('Crawler already running');
        return;
      }
      const state = await this.getState();
      try {
        for await (const newStateMapper of this.crawl(state)) {
          await this.patchState(newStateMapper);
        }
      } catch (error: any) {
        await this.patchState((state) => ({
          ...state,
          lastError: error.toString()
        }));
        logger.error('Error occurred in crawler: %s', error);
      }
    });
  }

  registerCrawler(crawlerAlarm: string): void {
    chrome.alarms.create(crawlerAlarm, { periodInMinutes: 5, delayInMinutes: 0 });
    const resetAlarm = crawlerAlarm + '_reset';
    chrome.alarms.create(resetAlarm, { periodInMinutes: 60 * 24 });
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === crawlerAlarm) {
        await this.runCrawler();
      } else if (alarm.name === resetAlarm) {
        const state = await this.getState();
        await this.setState({
          startTimestamp: new Date(state.startTimestamp.getTime() - 24 * 60 * 60 * 1000),
          upToDate: true,
        });
      }
    });
  }

}
