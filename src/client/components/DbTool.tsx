import hljs from 'highlight.js/lib/core';
import sqlLang from 'highlight.js/lib/languages/sql';
import { useContext, useState, useCallback } from "react";
import Editor from 'react-simple-code-editor';
import Card from './Card';
import { AppContext, downloadUrl, cleanupUrl } from "../lib";
import { ServerInterface, ErrorResponse } from "../../server";
import styles from "../styles/DbTool.module.css";

hljs.registerLanguage('sql', sqlLang);

interface OptionProps {
  serverClientFactory: () => Promise<ServerInterface>;
}

enum LoadingState {
  None = "None",
  Loading = "Loading",
  Success = "Success",
  Failed = "Failed",
}

function getOptionStatusClassName(state: LoadingState): string {
  switch (state) {
    case LoadingState.None:
      return "";
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

  return <div className={`${styles.optionStatus} ${className}`} />;
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
      console.trace(err);
      setState(LoadingState.Failed);
      setError(err.toString());
    }
  }

  return (
    <div className={styles.option}>
      <span>Regenerate Index:</span>
      <button onClick={regenerateIndex}>Regenerate</button>
      <OptionStatus state={state} />
      {state === LoadingState.Failed && (
        <span className={styles.errorText}>{error}</span>
      )}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runQuery = useCallback(async () => {
    setLoading(true);
    try {
      const client = await serverClientFactory();
      const result = await client.runQuery({ query: code });
      console.log("RESULT", result);
      setResults(result.result);
      setError(null);
    } catch (error: any) {
      const errorResp = error as ErrorResponse;
      setResults([]);
      setError(errorResp.message);
    } finally {
      setLoading(false);
    }
  }, [code]);

  return (
    <div className={styles.queryTool}>
      <span>Query Editor:</span>

      <Editor
        value={code}
        onValueChange={(code) => setCode(code)}
        highlight={(code) => hljs.highlight(code, { language: 'sql' }).value}
        padding={10}
        className={styles.editor}
      />

      <button onClick={runQuery} {...(loading && { disabled: true })}>
        Run query
      </button>

      {error && (
        <span>Error: {error}</span>
      )}

      <QueryToolResult results={results} />
    </div>
  );
}

export default function DbTool() {
  const { serverClientFactory } = useContext(AppContext);

  return (
    <Card>
      <h2>DB Tool</h2>

      <ExportDbOption serverClientFactory={serverClientFactory} />
      <RefreshSearchIndexOption serverClientFactory={serverClientFactory} />
      <QueryToolOption serverClientFactory={serverClientFactory} />
    </Card>
  );
}
