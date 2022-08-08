import EventTarget from "@ungap/event-target";
import { DataSource } from "typeorm";

export abstract class AbstractDBController {
  initCalled: boolean;
  dataSource: DataSource | undefined;
  private dbEvents: EventTarget;

  constructor() {
    this.initCalled = false;
    this.dataSource = undefined;
    this.dbEvents = new EventTarget();
  }

  protected abstract createDataSource(): Promise<DataSource>;

  protected abstract importDb(database: Uint8Array): Promise<void>;

  protected async initializeDb() {
    this.initCalled = true;
    try {
      this.dataSource = await this.createDataSource();
      this.dbEvents.dispatchEvent(new CustomEvent("init"));
    } catch (error) {
      this.initCalled = false;
      this.dbEvents.dispatchEvent(new CustomEvent("error", { detail: error }));
    }
  }

  async teardownDb() {
    await this.dataSource?.close();
    this.dataSource = undefined;
    this.initCalled = false;
  }

  useDataSource(): Promise<DataSource> {
    return new Promise((resolve, reject) => {
      if (this.dataSource !== undefined) {
        resolve(this.dataSource);
        return;
      }

      const cleanUp = () => {
        this.dbEvents.removeEventListener("error", handleError);
        this.dbEvents.removeEventListener("init", handleInit);
      };

      const handleInit = (event: Event) => {
        resolve(this.dataSource as DataSource);
        cleanUp();
      };

      const handleError = (event: Event) => {
        reject((event as CustomEvent).detail);
        cleanUp();
      };

      this.dbEvents.addEventListener("init", handleInit);
      this.dbEvents.addEventListener("error", handleError);

      if (!this.initCalled) {
        this.initializeDb();
      }
    });
  }
}
