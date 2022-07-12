import Card from '../../components/Card';
import Layout from '../../components/Layout';
import SettingsSideBar, { SettingsPage } from '../../components/SettingsSideBar';

export default function ClearBrowsingData() {
  return (
    <Layout>
      <h1>Clear Browsing Data</h1>

      <SettingsSideBar page={SettingsPage.ClearBrowsingData} />

      <Card>
        Coming soon!
      </Card>
    </Layout>
  );
}
