import { ServerInterface } from "../server";

export class RetentionPolicyManager {

  constructor(private readonly server: ServerInterface) {}

  registerManager(alarmName: string) {
    chrome.alarms.create(alarmName, { periodInMinutes: 60 });
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === alarmName) {
        await this.server.applyRetentionPolicy({});
      }
    })
  }

}
