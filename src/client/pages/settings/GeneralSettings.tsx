import Card from '../../components/Card';
import Form from '../../components/Form';
import Layout from "../../components/Layout";
import SettingsSideBar, { SettingsPage } from '../../components/SettingsSideBar';
import { useSettingsContext } from '../../lib/SettingsContext';

export default function Settings() {
  const settings = useSettingsContext();

  return (
    <Layout>
      <h1>Settings</h1>

      <SettingsSideBar page={SettingsPage.General} />

      <Card>
        <Form>
          <input
            type="checkbox"
            id="devModeEnabled"
            checked={settings.items.devModeEnabled}
            onChange={(evt) => {
              settings.patch({ devModeEnabled: evt.target.checked });
            }}
          />
          <label htmlFor="devModeEnabled">Dev Mode Enabled</label>
        </Form>
      </Card>
    </Layout>
  );
}
