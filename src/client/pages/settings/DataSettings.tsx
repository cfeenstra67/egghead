import { useState, useContext } from 'react';
import Card from '../../components/Card';
import Form from '../../components/Form';
import Layout from "../../components/Layout";
import SettingsSideBar, { SettingsPage } from '../../components/SettingsSideBar';
import SettingsOptionStatus, { LoadingState } from '../../components/SettingsOptionStatus';
import { AppContext } from "../../lib/context";
import parentLogger from '../../../logger';
import type { ServerInterface } from "../../../server";
import styles from "../../styles/utils.module.css";
import settingsStyles from "../../styles/Settings.module.css";

const logger = parentLogger.child({ context: 'DataSettings' });

interface OptionProps {
  serverClientFactory: () => Promise<ServerInterface>;
}

function RefreshSearchIndexOption({ serverClientFactory }: OptionProps) {
  const [state, setState] = useState(LoadingState.None);
  const [error, setError] = useState("");

  async function regenerateIndex() {
    if (state === LoadingState.Loading) {
      return;
    }

    setState(LoadingState.Loading);
    try {
      const client = await serverClientFactory();
      await client.regenerateIndex({});
      setState(LoadingState.Success);
    } catch (err: any) {
      logger.trace(err);
      setState(LoadingState.Failed);
      setError(err.toString());
    }
  }

  return (
    <>
      <div className={styles.column}>
        <label htmlFor="regenerateSearchIndex">Regenerate Search Index</label>
        <small>
          Regenerate the index used for searching from scratch.
        </small>
      </div>
      <div className={styles.row}>
        <input
          type="button"
          id="regenerateSearchIndex"
          onClick={regenerateIndex}
          value="Regenerate"
        />
        <SettingsOptionStatus state={state} />
        {state === LoadingState.Failed && (
          <span className={settingsStyles.errorText}>{error}</span>
        )}
      </div>
    </>
  );
}

export default function Settings() {
  const { serverClientFactory } = useContext(AppContext);

  return (
    <Layout>
      <h1>Data Settings</h1>

      <SettingsSideBar page={SettingsPage.Data} />

      <Card>
        <Form>
          <RefreshSearchIndexOption serverClientFactory={serverClientFactory} />
        </Form>
      </Card>
    </Layout>
  );
}
