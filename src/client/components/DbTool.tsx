import { useContext, useState } from 'react';
import { AppContext, downloadUrl, cleanupUrl } from '../lib';
import { ServerInterface } from '../../server';
import styles from '../styles/DbTool.module.css';

interface OptionProps {
  serverClientFactory: () => Promise<ServerInterface>;
}

enum LoadingState {
  None = 'None',
  Loading = 'Loading',
  Success = 'Success',
  Failed = 'Failed',
}

function getOptionStatusClassName(state: LoadingState): string {
  switch (state) {
    case LoadingState.None:
      return '';
    case LoadingState.Loading:
      return styles.optionLoading;
    case LoadingState.Success:
      return styles.optionSuccess;
    case LoadingState.Failed:
      return styles.optionError;
  }
}

interface OptionStatusProps {
  state: LoadingState;
}

function OptionStatus({ state }: OptionStatusProps) {
  const className = getOptionStatusClassName(state);

  return (
    <div className={`${styles.optionStatus} ${className}`} />
  );
}

function ExportDbOption({ serverClientFactory }: OptionProps) {
  const [state, setState] = useState(LoadingState.None);
  const [error, setError] = useState('');

  async function downloadDb() {
    if (state === LoadingState.Loading) {
      return;
    }

    setState(LoadingState.Loading);
    try {
      const client = await serverClientFactory();
      const { databaseUrl } = await client.exportDatabase({});
      downloadUrl(databaseUrl, 'history.db');
      cleanupUrl(databaseUrl);
      setState(LoadingState.Success);
    } catch (err: any) {
      console.trace(err);
      setState(LoadingState.Failed);
      setError(err.toString());
    }
  }

  return (
    <div className={styles.option}>
      <span>Export DB:</span>
      <button onClick={downloadDb}>Export</button>
      <OptionStatus state={state} />
      {state === LoadingState.Failed && (
        <span className={styles.errorText}>{error}</span>
      )}
    </div>
  );
}

function RefreshSearchIndexOption({ serverClientFactory }: OptionProps) {
  const [state, setState] = useState(LoadingState.None);
  const [error, setError] = useState('');

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
      console.trace(err);
      setState(LoadingState.Failed);
      setError(err.toString());
    }
  }

  return (
    <div className={styles.option}>
      <span>Regenerate Index:</span>
      <button onClick={regenerateIndex}>Regenerate</button>
      <OptionStatus state={state} setState={setState} />
      {state === LoadingState.Failed && (
        <span className={styles.errorText}>{error}</span>
      )}
    </div>
  );
}

export default function DbTool() {
  const { serverClientFactory } = useContext(AppContext);

  return (
    <div className={styles.dbTool}>
      <h2>DB Tool</h2>

      <ExportDbOption serverClientFactory={serverClientFactory} />
      <RefreshSearchIndexOption serverClientFactory={serverClientFactory} />
    </div>
  );
}
