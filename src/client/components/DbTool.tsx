import { useMutation } from "@tanstack/react-query";
import hljs from "highlight.js/lib/core";
import sqlLang from "highlight.js/lib/languages/sql";
import { ChevronsLeftRight, ChevronsRightLeft, Play } from "lucide-react";
import { useContext, useState } from "react";
import Editor from "react-simple-code-editor";
import parentLogger from "../../logger";
import type { ServerInterface } from "../../server";
import { AppContext } from "../lib";
import styles from "../styles/DbTool.module.css";
import SettingsOptionStatus, { LoadingState } from "./SettingsOptionStatus";
import { Button } from "./ui/button";

hljs.registerLanguage("sql", sqlLang);

const logger = parentLogger.child({ context: "DbTool" });

interface OptionProps {
  serverClientFactory: () => Promise<ServerInterface>;
}

function ResetDbOption({ serverClientFactory }: OptionProps) {
  const [state, setState] = useState(LoadingState.None);
  const [error, setError] = useState("");

  async function resetDatabase() {
    setState(LoadingState.Loading);

    try {
      const client = await serverClientFactory();

      await client.resetDatabase({});
      setError("");
      setState(LoadingState.Success);
    } catch (error: any) {
      setError(error.toString());
      setState(LoadingState.Failed);
    }
  }

  return (
    <>
      <div className="flex gap-6">
        <span>Reset DB:</span>

        <SettingsOptionStatus state={state} />
        {state === LoadingState.Failed && (
          <span className="text-destructive">{error}</span>
        )}
      </div>
      <div>
        <Button onClick={resetDatabase}>Reset</Button>
      </div>
    </>
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
    <>
      <div className="flex gap-6">
        <span>Regenerate Index:</span>
        <SettingsOptionStatus state={state} />
        {state === LoadingState.Failed && (
          <span className="text-destructive">{error}</span>
        )}
      </div>
      <div>
        <Button onClick={regenerateIndex}>Regenerate</Button>
      </div>
    </>
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
      const resp = await chrome.runtime.sendMessage({
        type: "resetCrawlerState",
      });
      if (resp === "ERROR") {
        throw new Error("error resetting crawler state");
      }
      setState(LoadingState.Success);
    } catch (err: any) {
      logger.trace(err);
      setState(LoadingState.Failed);
    }
  }

  return (
    <>
      <div className="flex gap-6">
        <span>Reset crawler state:</span>
        <SettingsOptionStatus state={state} />
      </div>
      <div>
        <Button onClick={resetState}>Reset</Button>
      </div>
    </>
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
    <div className="font-code overflow-x-scroll">
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

interface QueryToolOptionProps extends OptionProps {
  expanded?: boolean;
  setExpanded?: (expanded: boolean) => void;
}

function QueryToolOption({
  serverClientFactory,
  expanded,
  setExpanded,
}: QueryToolOptionProps) {
  const [code, setCode] = useState("");

  const query = useMutation({
    mutationKey: ["query", code],
    mutationFn: async () => {
      const client = await serverClientFactory();
      return await client.runQuery({ query: code });
    },
  });

  function handleKeyDown(
    evt: React.KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>,
  ) {
    // Cmd + return for submit
    if (evt.keyCode === 13 && evt.metaKey) {
      evt.preventDefault();
      query.mutate();
    }
  }

  return (
    <>
      <div className="flex gap-6">
        <span>Query Editor:</span>
        <SettingsOptionStatus
          state={
            query.status === "error"
              ? LoadingState.Failed
              : query.status === "pending"
                ? LoadingState.Loading
                : query.status === "idle"
                  ? LoadingState.None
                  : LoadingState.Success
          }
        />
      </div>
      <div />

      <div className="col-span-2 flex flex-col gap-8">
        <Editor
          value={code}
          onValueChange={(code) => setCode(code)}
          highlight={(code) => hljs.highlight(code, { language: "sql" }).value}
          padding={10}
          className="border-secondary border font-code"
          textareaClassName={styles.editorTextArea}
          onKeyDown={handleKeyDown}
        />

        <div className="flex gap-4">
          <Button onClick={() => query.mutate()} disabled={query.isPending}>
            <Play />
            Run query (⌘↵)
          </Button>
          {expanded ? (
            <Button onClick={() => setExpanded?.(false)}>
              <ChevronsRightLeft />
              Contract
            </Button>
          ) : (
            <Button onClick={() => setExpanded?.(true)}>
              <ChevronsLeftRight />
              Expand
            </Button>
          )}
        </div>

        {query.error ? <span>Error: {String(query.error)}</span> : null}

        {query.status === "success" ? (
          <QueryToolResult results={query.data.result} />
        ) : null}
      </div>
    </>
  );
}

export interface DbToolProps {
  expanded?: boolean;
  setExpanded?: (expanded: boolean) => void;
}

export default function DbTool({ expanded, setExpanded }: DbToolProps) {
  const { serverClientFactory } = useContext(AppContext);

  return (
    <div className="grid grid-cols-2 gap-4 gap-y-8">
      <ResetDbOption serverClientFactory={serverClientFactory} />
      <RefreshSearchIndexOption serverClientFactory={serverClientFactory} />
      <ResetCrawlerStateOption />
      <QueryToolOption
        serverClientFactory={serverClientFactory}
        expanded={expanded}
        setExpanded={setExpanded}
      />
    </div>
  );
}
