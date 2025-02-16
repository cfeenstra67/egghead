import { useMemo, useState } from "react";
import Layout from "./Layout";
import PopupLayout from "./PopupLayout";

interface ContainerProps extends React.PropsWithChildren {
  isPopup?: boolean;
}

function Container({ isPopup, children }: ContainerProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {isPopup ? null : (
        <div className="w-64 border-r bg-background hidden md:block" />
      )}
      <main className="flex-1 overflow-hidden min-h-full p-4 space-y-4 text-base">
        {!isPopup && <h1 className="text-2xl font-semibold">Activity</h1>}
        {children}
      </main>
    </div>
  );
}

interface LoadingStateProps {
  isPopup?: boolean;
  progress: number;
}

function LoadingState({ isPopup, progress }: LoadingStateProps) {
  const UseLayout = isPopup ? PopupLayout : Layout;

  return (
    <UseLayout>
      <Container isPopup={isPopup}>
        <div className="font-semibold">
          <p>Loading database: {(progress * 100).toFixed(1)}%.</p>
        </div>
      </Container>
    </UseLayout>
  );
}

interface ErrorStateProps {
  isPopup?: boolean;
  error: string;
}

function ErrorState({ isPopup, error }: ErrorStateProps) {
  const UseLayout = isPopup ? PopupLayout : Layout;

  return (
    <UseLayout>
      <Container isPopup={isPopup}>
        <p className="text-lg font-semibold">
          An error occurred while loading the database: {error}.
        </p>
        <p>
          {"Unfortunately this app isn't usable in this state, try reloading "}
          {"the page or contacting me at "}
          <a className="underline" href="mailto:me@camfeenstra.com">
            me@camfeenstra.com
          </a>{" "}
          {"for help if the issue persists."}
        </p>
      </Container>
    </UseLayout>
  );
}

export interface InitialLoadProps {
  dbUrl: string;
  getApp: (db: Uint8Array) => React.ReactElement;
  isPopup?: boolean;
}

export default function InitialLoad({
  dbUrl,
  getApp,
  isPopup,
}: InitialLoadProps) {
  const [db, setDb] = useState<Uint8Array | null>(null);
  const [progress, setProgress] = useState(0);
  const [dbError, setDbError] = useState<string | null>(null);

  useMemo(() => {
    fetch(dbUrl)
      .then(async (response) => {
        if (response.status !== 200) {
          throw new Error(
            `Database load failed with status ${response.status}`,
          );
        }
        const totalLength = Number(response.headers.get("Content-Length") ?? 0);
        if (totalLength === 0 || !response.body) {
          throw new Error(
            `Empty database found at ${dbUrl}, this is not expected`,
          );
        }
        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            chunks.push(value);
            receivedLength += value.length;
            setProgress(receivedLength / totalLength);
          }
        }

        const result = new Uint8Array(receivedLength);
        let position = 0;
        for (const chunk of chunks) {
          result.set(chunk, position);
          position += chunk.length;
        }

        setDb(result);
      })
      .catch(async (error) => {
        setDbError(error.toString());
      });
  }, [dbUrl]);

  const app = useMemo(() => db && getApp(db), [db, getApp]);

  return dbError !== null ? (
    <ErrorState isPopup={isPopup} error={dbError} />
  ) : app === null ? (
    <LoadingState isPopup={isPopup} progress={progress} />
  ) : (
    app
  );
}
