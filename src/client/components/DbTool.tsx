import hljs from 'highlight.js/lib/core';
import sqlLang from 'highlight.js/lib/languages/sql';
import { useContext, useState, useCallback, createRef } from "react";
import Editor from 'react-simple-code-editor';
import Card from './Card';
import { AppContext, downloadUrl, cleanupUrl } from "../lib";
import parentLogger from '../../logger';
import type { ServerInterface, ErrorResponse } from "../../server";
import SettingsOptionStatus, { LoadingState } from "./SettingsOptionStatus";
import styles from "../styles/DbTool.module.css";
import settingsStyles from "../styles/Settings.module.css";

hljs.registerLanguage('sql', sqlLang);

const logger = parentLogger.child({ context: 'DbTool' });

interface OptionProps {
  serverClientFactory: () => Promise<ServerInterface>;
}

function ExportDbOption({ serverClientFactory }: OptionProps) {
  const [state, setState] = useState(LoadingState.None);
  const [error, setError] = useState("");

  async function downloadDb() {
    if (state === LoadingState.Loading) {
      return;
    }

    setState(LoadingState.Loading);
    try {
      const client = await serverClientFactory();
      const { databaseUrl } = await client.exportDatabase({});
      downloadUrl(databaseUrl, "history.db");
      cleanupUrl(databaseUrl);
      setState(LoadingState.Success);
    } catch (err: any) {
      logger.trace(err);
      setState(LoadingState.Failed);
      setError(err.toString());
    }
  }

  return (
    <div className={styles.option}>
      <span>Export DB:</span>
      <button onClick={downloadDb}>Export</button>
      <SettingsOptionStatus state={state} />
      {state === LoadingState.Failed && (
        <span className={settingsStyles.errorText}>{error}</span>
      )}
    </div>
  );
}

function ImportDbOption({ serverClientFactory }: OptionProps) {
  const [state, setState] = useState(LoadingState.None);
  const [error, setError] = useState("");

  const fileRef = createRef<HTMLInputElement>();

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const client = await serverClientFactory();
    const file = event.target.files?.[0];
    const reader = new FileReader();

    setState(LoadingState.Loading);

    reader.addEventListener('load', async () => {
      try {
        await client.importDatabase({
          databaseUrl: reader.result as string,
        });
        setError('');
        setState(LoadingState.Success);
      } catch (error: any) {
        setError(error.toString());
        setState(LoadingState.Failed);
      }
    }, false);

    if (file) {
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className={styles.option}>
      <span>Import DB:</span>
      <input ref={fileRef} type="file" onChange={handleChange} />

      <SettingsOptionStatus state={state} />
      {state === LoadingState.Failed && (
        <span className={settingsStyles.errorText}>{error}</span>
      )}
    </div>
  );
}

function ResetDbOption({ serverClientFactory }: OptionProps) {
  const [state, setState] = useState(LoadingState.None);
  const [error, setError] = useState("");

  async function resetDatabase() {
    setState(LoadingState.Loading);

    try {
      const client = await serverClientFactory();

      await client.resetDatabase({});
      setError('');
      setState(LoadingState.Success);
    } catch (error: any) {
      setError(error.toString());
      setState(LoadingState.Failed);
    }
  }

  return (
    <div className={styles.option}>
      <span>Reset DB:</span>
      <button onClick={resetDatabase}>Reset</button>

      <SettingsOptionStatus state={state} />
      {state === LoadingState.Failed && (
        <span className={settingsStyles.errorText}>{error}</span>
      )}
    </div>
  );
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
    <div className={styles.option}>
      <span>Regenerate Index:</span>
      <button onClick={regenerateIndex}>Regenerate</button>
      <SettingsOptionStatus state={state} />
      {state === LoadingState.Failed && (
        <span className={settingsStyles.errorText}>{error}</span>
      )}
    </div>
  );
}

function ResetCrawlerStateOption() {
  const [state, setState] = useState(LoadingState.None);

  async function resetState() {
    if (state === LoadingState.Loading) {
      return;
    }

    setState(LoadingState.Loading);
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'resetCrawlerState' });
      if (resp === 'ERROR') {
        throw new Error('error resetting crawler state');
      }
      setState(LoadingState.Success);
    } catch (err: any) {
      logger.trace(err);
      setState(LoadingState.Failed);
    }
  }

  return (
    <div className={styles.option}>
      <span>Reset crawler state:</span>
      <button onClick={resetState}>Reset</button>
      <SettingsOptionStatus state={state} />
    </div>
  );
}

interface QueryToolResultProps {
  results: any[];
}

function QueryToolResult({ results }: QueryToolResultProps) {
  if (results.length === 0) {
    return <></>;
  }
  const columns = Object.keys(results[0]);
  const page = 25;
  const [limit, setLimit] = useState(page);
  const showResults = results.slice(0, limit);
  const isMore = results.length > limit;

  return (
    <div className={styles.resultTable}>
      <span>Results:</span>

      <table>
        <thead>
          {columns.map((colName, idx) => (
            <th key={idx}>{colName}</th>
          ))}
        </thead>
        <tbody>
          {showResults.map((row, idx) => (
            <tr key={idx}>
              {columns.map((colName, idx) => (
                <td key={idx}>{row[colName]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {isMore && (
        <span
          className={styles.queryToolSeeMore}
          onClick={() => setLimit(limit + page)}
        >
          {results.length - limit} more results...
        </span>
      )}
    </div>
  );
}

function QueryToolOption({ serverClientFactory }: OptionProps) {
  const [code, setCode] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async () => {
    setLoading(true);
    try {
      const client = await serverClientFactory();
      const before = new Date();
      const result = await client.runQuery({ query: code });
      const after = new Date();
      setLoadTime(after.getTime() - before.getTime());
      setResults(result.result);
      setError(null);
    } catch (error: any) {
      const errorResp = error as ErrorResponse;
      setResults([]);
      setError(errorResp.message);
      setLoadTime(null);
    } finally {
      setLoading(false);
    }
  }, [code]);

  function handleKeyDown(
    evt: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>
  ) {
    // Cmd + return for submit
    if (evt.keyCode === 13 && evt.metaKey) {
      evt.preventDefault();
      runQuery();
    }
  }

  return (
    <div className={styles.queryTool}>
      <span>Query Editor:</span>

      <Editor
        value={code}
        onValueChange={(code) => setCode(code)}
        highlight={(code) => hljs.highlight(code, { language: 'sql' }).value}
        padding={10}
        className={styles.editor}
        textareaClassName={styles.editorTextArea}
        onKeyDown={handleKeyDown}
      />

      <button onClick={runQuery} {...(loading && { disabled: true })}>
        Run query
      </button>

      {error ? (
        <span>Error: {error}</span>
      ) : loadTime !== null ? (
        <span>Execution time: {loadTime}ms</span>
      ) : <></>}

      <QueryToolResult results={results} />
    </div>
  );
}

export default function DbTool() {
  const { serverClientFactory } = useContext(AppContext);

  return (
    <Card>
      <h2>DB Tool</h2>

      <ImportDbOption serverClientFactory={serverClientFactory} />
      <ExportDbOption serverClientFactory={serverClientFactory} />
      <ResetDbOption serverClientFactory={serverClientFactory} />
      <RefreshSearchIndexOption serverClientFactory={serverClientFactory} />
      <ResetCrawlerStateOption />
      <QueryToolOption serverClientFactory={serverClientFactory} />
    </Card>
  );
}
