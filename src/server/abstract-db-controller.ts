import EventTarget from "@ungap/event-target";
import { SQLConnection } from "./sql-primitives";

export abstract class AbstractDBController {
  initCalled: boolean;
  connection?: SQLConnection;
  private dbEvents: EventTarget;

  constructor() {
    this.initCalled = false;
    this.dbEvents = new EventTarget();
  }

  protected abstract createConnection(): Promise<SQLConnection>;

  protected async initializeDb() {
    this.initCalled = true;
    try {
      this.connection = await this.createConnection();
      this.dbEvents.dispatchEvent(new CustomEvent("init"));
    } catch (error) {
      this.initCalled = false;
      this.dbEvents.dispatchEvent(new CustomEvent("error", { detail: error }));
    }
  }

  async teardownDb() {
    await this.connection?.close();
    this.connection = undefined;
    this.initCalled = false;
  }

  useConnection(): Promise<SQLConnection> {
    return new Promise((resolve, reject) => {
      if (this.connection !== undefined) {
        resolve(this.connection);
        return;
      }

      const cleanUp = () => {
        this.dbEvents.removeEventListener("error", handleError);
        this.dbEvents.removeEventListener("init", handleInit);
      };

      const handleInit = (event: Event) => {
        resolve(this.connection as SQLConnection);
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
