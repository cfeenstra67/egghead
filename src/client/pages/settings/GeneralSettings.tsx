import { Theme } from "../../../server/types";
import Card from "../../components/Card";
import Form from "../../components/Form";
import Layout from "../../components/Layout";
import SettingsSideBar, {
  SettingsPage,
} from "../../components/SettingsSideBar";
import { useSettingsContext } from "../../lib/SettingsContext";
import settingsStyles from "../../styles/Settings.module.css";
import styles from "../../styles/utils.module.css";

export default function Settings() {
  const settings = useSettingsContext();

  return (
    <Layout>
      <h1>Settings</h1>

      <SettingsSideBar page={SettingsPage.General} />

      <Card>
        <Form>
          <div className={styles.column}>
            <label htmlFor="theme">Theme</label>
            <small>
              {'Change the look and feel of Egghead. Choosing "Auto" will '}
              {"respect your system-wide theme preference."}
            </small>
          </div>
          <select
            name="theme"
            id="theme"
            onChange={(evt) => {
              settings.patch({ theme: evt.target.value as Theme });
            }}
          >
            <option value={Theme.Auto}>Auto</option>
            <option value={Theme.Dark}>Dark</option>
            <option value={Theme.Light}>Light</option>
          </select>

          <div className={styles.column}>
            <label htmlFor="retention-policy">Retention Period</label>
            <small>
              {
                "Specify how many months you'd like egghead to retain your data "
              }
              {
                "for. Reducing this can help improve search performance. Changing "
              }
              {"this setting will take up to one hour to take effect."}
            </small>
          </div>
          <div className={settingsStyles.retentionPeriod}>
            <input
              type="number"
              name="retention-policy"
              id="retention-policy"
              value={settings.items.retentionPolicyMonths}
              onChange={(evt) => {
                settings.patch({
                  retentionPolicyMonths: Number.parseInt(evt.target.value),
                });
              }}
            />
            <span>Month(s)</span>
          </div>

          <div className={styles.column}>
            <label htmlFor="devModeEnabled">Dev Mode Enabled</label>
            <small>{"Only enable this if you know what you're doing."}</small>
          </div>
          <input
            type="checkbox"
            id="devModeEnabled"
            checked={settings.items.devModeEnabled}
            onChange={(evt) => {
              settings.patch({ devModeEnabled: evt.target.checked });
            }}
          />
        </Form>
      </Card>
    </Layout>
  );
}
