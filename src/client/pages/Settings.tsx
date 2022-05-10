import { useContext } from 'react';
import Layout from '../components/Layout';
import { AppContext, downloadUrl, cleanupUrl } from '../lib';

export default function Settings() {
  const { serverClientFactory } = useContext(AppContext);

  async function downloadDb() {
    const client = await serverClientFactory();
    const { databaseUrl } = await client.exportDatabase({});
    downloadUrl(databaseUrl, 'history.db');
    cleanupUrl(databaseUrl);
  }

  return (
    <Layout>
      <h1>Settings</h1>

      <button onClick={downloadDb}>Export DB</button>
    </Layout>
  );
}
