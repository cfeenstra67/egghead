import { useState } from 'react';
import InitialLoad from './InitialLoad';
import { useLayoutClassNames } from './Layout';
import RadioSelect from './RadioSelect';
import styles from '../styles/DemoWrapper.module.css';

export interface DemoWrapperProps {
  getApp: (db: Uint8Array) => React.ReactElement;
  isPopup?: boolean;
}

export default function DemoWrapper({ getApp, isPopup }: DemoWrapperProps) {
  const [currentValue, setCurrentValue] = useState<string | null>(null);

  const layoutClassNames = useLayoutClassNames();

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
  ) : (
    <div className={layoutClassNames.join(' ')}>
      <div className={styles.content}>
        <div className={styles.title}>
          <h1>Welcome!</h1>
        </div>
        <p>
          This is a live demo for the Egghead history extension. Since this is
          just a regular web page and can{"'"}t access your <i>actual</i> browser
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
          ]}
        />
        <p>
          You can always <b>Reload</b> the page to choose another option.
        </p>
      </div>
    </div>
  );
}
