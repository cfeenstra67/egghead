import { useState } from "react";
import styles from "../styles/DemoWrapper.module.css";
import InitialLoad from "./InitialLoad";
import { useLayoutClassNames } from "./Layout";
import RadioSelect from "./RadioSelect";

export interface DemoWrapperProps {
  getApp: (db: Uint8Array) => React.ReactElement;
  isPopup?: boolean;
}

export default function DemoWrapper({ getApp, isPopup }: DemoWrapperProps) {
  const [currentValue, setCurrentValue] = useState<string | null>(null);

  const layoutClassNames = useLayoutClassNames();

  return currentValue === "demo-full" ? (
    <InitialLoad dbUrl="demo.db" getApp={getApp} isPopup={isPopup} />
  ) : currentValue === "demo-small" ? (
    <InitialLoad dbUrl="demo-small.db" getApp={getApp} isPopup={isPopup} />
  ) : (
    <div className={layoutClassNames.join(" ")}>
      <div className={styles.content}>
        <div className={styles.title}>
          <h1>Welcome!</h1>
        </div>
        <p>
          This is a live demo for the Egghead history extension. Since this is
          just a regular web page and can{"'"}t access your <i>actual</i>{" "}
          browser history, there are a couple of different options to demo the
          app:
        </p>
        <RadioSelect
          value={currentValue}
          setValue={setCurrentValue}
          options={[
            {
              value: "demo-full",
              description:
                "Download the full demo database (~30MB). If you have a slower" +
                " internet connection, this may take a while.",
            },
            {
              value: "demo-small",
              description: "Download a smaller demo database (~5MB).",
            },
          ]}
        />
        <p>
          You can always <b>Reload</b> the page to choose another option.
        </p>
        <p>
          If you{"'"}re looking for more information about Egghead, check out
          the{" "}
          <a
            href="https://docs.egghead.camfeenstra.com"
            target="_blank"
            rel="noreferrer"
          >
            documentation
          </a>{" "}
          or the{" "}
          <a
            href="https://github.com/cfeenstra67/egghead"
            target="_blank"
            rel="noreferrer"
          >
            github repo
          </a>
          .
        </p>
        <p>
          If you{"'"}d like to see other projects I{"'"}ve worked on or get in
          contact with me, check out{" "}
          <a
            href="https://www.camfeenstra.com"
            target="_blank"
            rel="noreferrer"
          >
            my personal website
          </a>
          .
        </p>
        <div className={styles.badges}>
          <a
            href="https://chrome.google.com/webstore/detail/egghead-history/gnbambehlmjiemgkmekipjgooacicknb"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/chrome-badge.png" />
          </a>
          <a
            href="https://addons.mozilla.org/en-US/firefox/addon/egghead-history/"
            target="_blank"
            rel="noreferrer"
          >
            <img src="/firefox-badge.png" />
          </a>
        </div>
      </div>
    </div>
  );
}
