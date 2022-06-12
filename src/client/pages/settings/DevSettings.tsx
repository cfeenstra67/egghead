import Card from '../../components/Card';
import DbTool from "../../components/DbTool";
import Layout from "../../components/Layout";
import SettingsSideBar, { SettingsPage } from '../../components/SettingsSideBar';
import { useSettingsContext } from '../../lib/SettingsContext';

function DevSettingsContent() {
  return (
    <>
      <DbTool />
    </>
  );
}

export default function DevSettings() {
  const settings = useSettingsContext();

  return (
    <Layout>
      <h1>Dev Settings</h1>

      <SettingsSideBar page={SettingsPage.Dev} />

      {settings.items.devModeEnabled ? (
        <DevSettingsContent />
      ) : (
        <Card>
          Dev mode not enabled.
        </Card>
      )}
    </Layout>
  );
}
