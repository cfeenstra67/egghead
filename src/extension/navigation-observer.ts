import EventTarget from "@ungap/event-target"

// Modified from here:
// https://github.com/GoogleChrome/chrome-extensions-samples/blob/main/mv2-archive/api/webNavigation/basic/navigation_collector.js
export class NavigationObserver {

  public pending: Record<string, NavigationObserver.PendingRequest>
  private target: EventTarget;
  private saveTime: Date | null;

  constructor(public storageName: string) {
    this.pending = {};
    this.target = new EventTarget();
    this.saveTime = null;
  }

  saveState(callback?: () => void) {
    this.saveTime = new Date();
    const obj = {
      [this.storageName]: {
        pending: this.pending,
        saveTime: this.saveTime.getTime()
      }
    };
    chrome.storage.local.set(obj, callback);
  }

  loadState(callback: () => void) {
    chrome.storage.local.get([this.storageName], (result: any) => {
      const stored = result[this.storageName];
      if (this.saveTime && stored && stored.saveTime) {
        const saveTime = new Date(stored.saveTime);
        // The stored data is not up to date
        if (saveTime < this.saveTime) {
          console.warn("Ignoring old data from", saveTime);
          return;
        }
      }
      if (stored) {
        this.pending = stored.pending;
        this.saveTime = stored.saveTime ? new Date(stored.saveTime) : new Date();
      }
      callback();
    });
  }

  patchState(
    id: string,
    patch: (obj: NavigationObserver.PendingRequest) => void,
    callback?: () => void
  ) {
    this.loadState(() => {
      this.prepareDataStorage(id);
      patch(this.pending[id]);
      this.saveState(callback);
    })
  }

  wrapEventHandler(handler: (data: any) => void) {
    const wrapped = (data: any) => {
      this.loadState(() => {
        handler(data);
        this.saveState();
      });
      return true;
    };
    Object.defineProperty(wrapped, 'name', {
      value: handler.name,
      writable: false
    });
    return wrapped;
  }

  observeNavigation() {
    chrome.webNavigation.onCreatedNavigationTarget.addListener(
      this.onCreatedNavigationTargetListener.bind(this)
    );
    chrome.webNavigation.onBeforeNavigate.addListener(
      this.onBeforeNavigateListener.bind(this)
    );
    chrome.webNavigation.onCompleted.addListener(
      this.wrapEventHandler(this.onCompletedListener.bind(this))
    );
    chrome.webNavigation.onCommitted.addListener(
      this.wrapEventHandler(this.onCommittedListener.bind(this))
    );
    chrome.webNavigation.onErrorOccurred.addListener(
      this.wrapEventHandler(this.onErrorOccurredListener.bind(this))
    );
    chrome.webNavigation.onReferenceFragmentUpdated.addListener(
      this.wrapEventHandler(this.onReferenceFragmentUpdatedListener.bind(this))
    );
    chrome.webNavigation.onHistoryStateUpdated.addListener(
      this.wrapEventHandler(this.onHistoryStateUpdatedListener.bind(this))
    );
  }

  // This should probably be improved to be more precise--for some reason a lot of
  // keys get left in the object
  cleanUpStorage() {
    const now = new Date();
    this.loadState(() => {
      const toDelete: string[] = [];
      Object.entries(this.pending).map(([key, value]) => {
        if (!value.start) {
          return;
        }

        const start = new Date(value.start);
        const daysOld = (now.getTime() - start.getTime()) / 1000 / 3600 / 24; 
        if (daysOld > 7) {
          toDelete.push(key);
        }
      });

      toDelete.forEach((key) => {
        delete this.pending[key];
      });

      this.saveState();
    });
  }

  parseId(id: string): [number | null, number | null] {
    const parts = id.split("-", 2);
    if (parts.length != 2) {
      return [null, null];
    }
    return parts
      .map(parseInt)
      .map(x => isNaN(x) ? null : x) as [number | null, number | null];
  }

  constructId(data: any): string {
    return data.tabId + '-' + (data.frameId ? data.frameId : 0);
  }

  prepareDataStorage(id: string): void {
    this.pending[id] = this.pending[id] || {
      openedInNewTab: false,
      source: {
        frameId: null,
        tabId: null
      },
      start: null,
      transitionQualifiers: [],
      transitionType: null
    };
  }

  onCreatedNavigationTargetListener(data: any): void {
    const id = this.constructId(data);
    const patch = (existing: NavigationObserver.PendingRequest) => {
      existing.openedInNewTab = !!data.tabId;
      existing.source = {
        tabId: data.sourceTabId,
        frameId: data.sourceFrameId
      };
      existing.start = data.timeStamp;
    };

    this.patchState(id, patch);
  }

  onBeforeNavigateListener(data: any): void {
    const id = this.constructId(data);
    const patch = (existing: NavigationObserver.PendingRequest) => {
      existing.start = existing.start || data.timeStamp;
    };

    this.patchState(id, patch);
  }

  onCommittedListener(data: any): void {
    const id = this.constructId(data);
    if (!this.pending[id]) {
      console.debug(
          'errorCommittedWithoutPending',
          data.url,
          data);
    } else {
      this.prepareDataStorage(id);
      this.pending[id].transitionType = data.transitionType;
      this.pending[id].transitionQualifiers = data.transitionQualifiers;
    }
  }

  onReferenceFragmentUpdatedListener(data: any): void {
    const id = this.constructId(data);
    if (!this.pending[id]) {
      const detail: NavigationObserver.Request = {
        duration: 0,
        openedInNewTab: false,
        source: {
          frameId: null,
          tabId: null
        },
        transitionQualifiers: data.transitionQualifiers,
        transitionType: data.transitionType,
        url: data.url,
        tabId: data.tabId,
        frameId: data.frameId
      };

      const event = new CustomEvent(NavigationObserver.EventType.NAVIGATION_COMPLETE, { detail });

      this.target.dispatchEvent(event);
    } else {
      this.prepareDataStorage(id);
      this.pending[id].transitionType = data.transitionType;
      this.pending[id].transitionQualifiers = data.transitionQualifiers;
    }
  }

  onHistoryStateUpdatedListener(data: any): void {
    const id = this.constructId(data);
    if (!this.pending[id]) {
      const detail: NavigationObserver.Request = {
        duration: 0,
        openedInNewTab: false,
        source: {
          frameId: null,
          tabId: null
        },
        transitionQualifiers: data.transitionQualifiers,
        transitionType: data.transitionType,
        url: data.url,
        tabId: data.tabId,
        frameId: data.frameId
      };

      const event = new CustomEvent(NavigationObserver.EventType.NAVIGATION_COMPLETE, { detail });

      this.target.dispatchEvent(event);
    } else {
      this.prepareDataStorage(id);
      this.pending[id].transitionType = data.transitionType;
      this.pending[id].transitionQualifiers = data.transitionQualifiers;
    }
  }

  onCompletedListener(data: any): void {
    const id = this.constructId(data);
    if (!this.pending[id]) {
      console.debug(
          'errorCompletedWithoutPending',
          data.url,
          data);
    } else {
      const detail: NavigationObserver.Request = {
        duration: (data.timeStamp - this.pending[id].start),
        openedInNewTab: this.pending[id].openedInNewTab,
        source: this.pending[id].source || {tabId: null, frameId: null},
        transitionQualifiers: this.pending[id].transitionQualifiers || [],
        transitionType: this.pending[id].transitionType as NavigationObserver.NavigationType,
        url: data.url,
        tabId: data.tabId,
        frameId: data.frameId
      };

      const event = new CustomEvent(NavigationObserver.EventType.NAVIGATION_COMPLETE, { detail });

      delete this.pending[id];
      this.target.dispatchEvent(event);
    }
  }

  onErrorOccurredListener(data: any): void {
    const id = this.constructId(data);
    if (!this.pending[id]) {
      console.error(
          'errorErrorOccurredWithoutPending',
          data.url,
          data);
    } else {
      this.prepareDataStorage(id);

      const detail: NavigationObserver.Request = {
        duration: (data.timeStamp - this.pending[id].start),
        openedInNewTab: this.pending[id].openedInNewTab,
        source: this.pending[id].source || {tabId: null, frameId: null},
        transitionQualifiers: this.pending[id].transitionQualifiers || [],
        transitionType: this.pending[id].transitionType as NavigationObserver.NavigationType,
        url: data.url,
        tabId: data.tabId,
        frameId: data.frameId
      };

      const event = new CustomEvent(NavigationObserver.EventType.NAVIGATION_ERROR, { detail });

      delete this.pending[id];
      this.target.dispatchEvent(event);
    }
  }

  onNavigationComplete(handler: (event: NavigationObserver.NavigationEvent) => void): void {
    this.target.addEventListener(
      NavigationObserver.EventType.NAVIGATION_COMPLETE,
      (evt: any) => handler(evt as NavigationObserver.NavigationEvent)
    )
  }

  onNavigationError(handler: (event: NavigationObserver.NavigationEvent) => void): void {
    this.target.addEventListener(
      NavigationObserver.EventType.NAVIGATION_ERROR,
      (evt: any) => handler(evt as NavigationObserver.NavigationEvent)
    )
  }

}

export namespace NavigationObserver {

  export interface Source {
    frameId: number | null,
    tabId: number | null
  }

  export interface Request {
    url: string,
    tabId: number | null,
    frameId: number | null,
    transitionType: NavigationObserver.NavigationType,
    transitionQualifiers: Array<NavigationObserver.NavigationQualifier>,
    openedInNewTab?: boolean,
    source: NavigationObserver.Source,
    duration: number
  }

  export interface PendingRequest {
    start: number,
    openedInNewTab?: boolean,
    source?: NavigationObserver.Source,
    transitionType?: NavigationObserver.NavigationType,
    transitionQualifiers?: Array<NavigationObserver.NavigationQualifier>
  }

  export enum NavigationType {
    AUTO_BOOKMARK = 'auto_bookmark',
    AUTO_SUBFRAME = 'auto_subframe',
    FORM_SUBMIT = 'form_submit',
    GENERATED = 'generated',
    KEYWORD = 'keyword',
    KEYWORD_GENERATED = 'keyword_generated',
    LINK = 'link',
    MANUAL_SUBFRAME = 'manual_subframe',
    RELOAD = 'reload',
    START_PAGE = 'start_page',
    TYPED = 'typed'
  }

  export enum NavigationQualifier {
    CLIENT_REDIRECT = 'client_redirect',
    FORWARD_BACK = 'forward_back',
    SERVER_REDIRECT = 'server_redirect'
  }

  export enum EventType {
    NAVIGATION_COMPLETE = 'navigation_complete',
    NAVIGATION_ERROR = 'navigation_error'
  }

  export interface NavigationEvent {
    detail: Request
  }

}
