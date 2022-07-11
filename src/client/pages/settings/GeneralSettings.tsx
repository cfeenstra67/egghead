import Card from '../../components/Card';
import Form from '../../components/Form';
import Layout from "../../components/Layout";
import SettingsSideBar, { SettingsPage } from '../../components/SettingsSideBar';
import { useSettingsContext } from '../../lib/SettingsContext';
import { Theme } from "../../../server/types";
import styles from "../../styles/Settings.module.css";

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
              {'Change the look and feel of Egghead. Choosing "auto" will '}
              {'respect your system-wide theme preference.'}
            </small>
          </div>
          <select
            name="theme"
            id="theme"
            onChange={(evt) => {
              settings.patch({ theme: evt.target.value as Theme })
            }}
          >
            <option value={Theme.Auto}>Auto</option>
            <option value={Theme.Dark}>Dark</option>
            <option value={Theme.Light}>Light</option>
          </select>

          <div className={styles.column}>
            <label htmlFor="devModeEnabled">Dev Mode Enabled</label>
            <small>
              {"Only enable this if you know what you're doing."}
            </small>
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
