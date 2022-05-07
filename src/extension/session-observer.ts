import { ServerInterface } from '../server';
import { TabObserver } from './tab-observer';

export class SessionObserver {

  constructor(readonly server: ServerInterface) {}

  observeSessions(tabObserver: TabObserver): void {
    tabObserver.onSessionStarted(this.handleSessionStartedEvent.bind(this));
    tabObserver.onSessionEnded(this.handleSessionEndedEvent.bind(this));
  }

  async handleSessionStartedEvent(event: TabObserver.SessionStartedEvent): Promise<void> {
    console.log("Session started", event.detail);
    const response = await this.server.startSession({
      session: event.detail.session,
      parentSessionId: event.detail.oldSession?.id,
      transitionType: event.detail.transitionType,
    });
    console.log("Session start sent to server", response);
  }

  async handleSessionEndedEvent(event: TabObserver.SessionEndedEvent): Promise<void> {
    console.log("Session ended", event.detail);
    const response = await this.server.endSession({ session: event.detail.session });
    console.log("Session end sent to server", response);
  }

}
