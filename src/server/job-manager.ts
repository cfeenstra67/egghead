import queue from "queue";
import { Aborted } from "./abort";

export class JobManager {

  private readonly queue: queue;
  private readonly aborts: Record<string, AbortController>;

  constructor(private readonly requestTimeout: number, concurrency = 1) {
    this.queue = queue({
      timeout: requestTimeout,
      concurrency,
    });
    this.queue.setMaxListeners(10 * 1000);
    this.aborts = {};
  }

  private async runJob<T>(abort: AbortSignal, job: (abort: AbortSignal) => Promise<T>): Promise<T> {
    if (abort.aborted) {
      throw new Aborted();
    }
    return await job(abort);
  }

  addJob(jobId: string, job: (abort: AbortSignal) => Promise<any>): void {
    const abortController = new AbortController();
    const jobInstance: any = () => this.runJob(abortController.signal, job);
    jobInstance.id = jobId;
    this.aborts[jobId] = abortController;
    this.queue.push(jobInstance);
    this.queue.start();
  }

  abortJob(jobId: string): void {
    this.aborts[jobId]?.abort();
  }

  completeJob(jobId: string): void {
    if (this.aborts[jobId]) {
      delete this.aborts[jobId];
    }
  }

  jobPromise(jobId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const successCb = (result: any, job: any) => {
        if (job.id === jobId) {
          resolve(result);
          this.removeListener("success", successCb);
        }
      };
      this.on("success", successCb);
      const errorCb = (err: any, job: any) => {
        if (job.id === jobId) {
          reject(err);
          this.removeListener("error", errorCb);
        }
      }
      this.on("error", errorCb);
      const timeoutCb = (_: any, job: any) => {
        if (job.id === jobId) {
          reject(new Error('`Job timed out after ${this.requestTimeout}ms.`'));
          this.removeListener("timeout", timeoutCb);
        }
      }
      this.on("timeout", timeoutCb);
    });
  }

  private handleEvent(job: any, event: string | symbol): void {
    if (['success', 'error', 'callback'].includes(event as string)) {
      this.completeJob(job.id);
    }
  }

  on: queue["on"] = (event, handler) => {
    return this.queue.on(event, (arg, job) => {
      this.handleEvent(job, event);
      return handler(arg, job);
    });
  }

  once: queue["once"] = (event, handler) => {
    return this.queue.once(event, (arg, job) => {
      this.handleEvent(job, event);
      return handler(arg, job);
    });
  }

  removeListener: queue["removeListener"] = (event, handler) => {
    return this.queue.removeListener(event, handler);
  }

}
