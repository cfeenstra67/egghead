import hljs from 'highlight.js/lib/core';
import jsLang from 'highlight.js/lib/languages/javascript';
import { useState, useMemo } from 'react';
import App from '../App';
import CodeBlock from './CodeBlock';
import InitialLoad from './InitialLoad';
import { useLayoutClassNames } from './Layout';
import Popup from '../Popup';
import RadioSelect from './RadioSelect';
import styles from '../styles/DemoWrapper.module.css';
import layoutStyles from '../styles/Layout.module.css';

hljs.registerLanguage('js', jsLang);

const historyCode = `
chrome.history.search({
  text: '',
  startTime: 0,
  endTime: new Date().getTime(),
  maxResults: 100 * 1000
}, (results) => globalThis.$historyData = results);
`.trim();

export interface DemoWrapperProps {
  getApp: (db: Uint8Array) => React.ReactElement;
  isPopup?: boolean;
}

// function useGlobalHistoryData(): []

interface GlobalHistoryWaiterProps {
  onData: (data: Uint8Array) => void;
}

function GlobalHistoryWaiter({ onData }: GlobalHistoryWaiterProps) {
  const [globalData, setGlobalData] = useState<any>(null);
  const [dataProcessed, setDataProcessed] = useState(false);

  useMemo(() => {
    if (globalData === null) {
      return;
    }
    console.log('global data', globalData);
  }, [globalData])

  return globalData === null ? (
    <p>Waiting for data...</p>
  ) : (
    <p>Processing data...</p>
  );
}

export default function DemoWrapper({ getApp, isPopup }: DemoWrapperProps) {
  const [currentValue, setCurrentValue] = useState<string | null>(null);
  const [globalData, setGlobalData] = useState<Uint8Array | null>(null);

  const [cont, setCont] = useState(false);

  const layoutClassNames = useLayoutClassNames();

  const globalDataApp = useMemo(() => globalData && getApp(globalData), [globalData]);

  return currentValue === 'demo-full' ? (
    <InitialLoad
      dbUrl="demo.db"
      getApp={getApp}
      isPopup={isPopup}
    />
  ) : currentValue === 'demo-small' ? (
    <InitialLoad
      dbUrl="demo-small.db"
      getApp={getApp}
      isPopup={isPopup}
    />
  ) : globalData !== null ? (
    globalDataApp
  ) : (
    <div className={layoutClassNames.join(' ')}>
      <div className={styles.content}>
        <div className={styles.title}>

          <h1 onClick={() => setCont(true)}>Welcome!</h1>
        </div>
        <p>
          This is a live demo for the Egghead history extension. Since this is
          just a regular web page and can't access your <i>actual</i> browser
          history, there are a couple of different options to demo the app:
        </p>
        <RadioSelect
          value={currentValue}
          setValue={setCurrentValue}
          options={[
            {
              value: 'demo-full',
              description: (
                'Download the full demo database (~30MB). If you have a slower' +
                ' internet connection, this may take a while.'
              ),
            },
            {
              value: 'demo-small',
              description: 'Download a smaller demo database (~5MB).',
            },
            // NOTE: Actually this doesn't work, regular web pages can't access
            // chrome.history in the console as I thought.
            // {
            //   value: 'import-history',
            //   description: (
            //     'Import your own history (requires extra steps and will be a ' +
            //     'degraded experience vs. the extension)'
            //   ),
            //   component: () => (
            //     <>
            //       <p>
            //         <i>
            //           If you choose this method, your data will not be sent anywhere--
            //           there are no Egghead servers that process your data. Everything
            //           will stay within your web browser, and you can browse your history
            //           data 100% privately.
            //         </i>
            //       </p>
            //       <p>
            //         {`This will require you to paste a chunk of code into your browser's dev `}
            //         {`console. That's a request you should be very wary of--so you should `}
            //         {`only do this if understand the code you'll have to run.`}
            //       </p>
            //       <p>
            //         {`You'll be able to test out the searching and other features with this `}
            //         method, but the data quality will be <b>significantly better</b> if
            //         you download the extension.
            //       </p>
            //       <p>
            //         First, copy the following block of code:
            //         <CodeBlock code={historyCode} language="js" />
            //       </p>
            //       <p>
            //         Then, run <code>Cmd + Option + J</code> (Mac) or{' '}
            //         <code>Ctrl + Option + J</code> (Windows) to open the{' '}
            //         <b>dev console</b> for this web page.
            //       </p>
            //       <p>
            //         Finally, paste the code with <code>Cmd + V</code> (Mac) or{' '}
            //         <code>Ctrl + J</code> (Windows) and press <code>Enter</code>{' '}
            //         to run the command. This page will automatically update when it{' '}
            //         detects the data.
            //       </p>

            //       <GlobalHistoryWaiter onData={setGlobalData} />
            //     </>
            //   )
            // }
          ]}
        />
        <p>
          You can always <b>Reload</b> the page to choose another option.
        </p>
      </div>
    </div>
  );
}
