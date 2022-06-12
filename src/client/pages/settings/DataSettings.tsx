import Card from '../../components/Card';
import Layout from "../../components/Layout";
import SettingsSideBar, { SettingsPage } from '../../components/SettingsSideBar';

export default function Settings() {
  return (
    <Layout>
      <h1>Data Settings</h1>

      <SettingsSideBar page={SettingsPage.Data} />

      <Card>
        <p>Nothing here yet</p>
      </Card>
    </Layout>
  );
}
