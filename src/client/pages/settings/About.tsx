import Card from '../../components/Card';
import Layout from '../../components/Layout';
import SettingsSideBar, { SettingsPage } from '../../components/SettingsSideBar';
import { version, platform } from '../../../constants';
import styles from '../../styles/About.module.css';

export default function About() {
  return (
    <Layout>
      <h1>About</h1>

      <SettingsSideBar page={SettingsPage.About} />

      <Card className={styles.aboutCard}>
        <p><b>Version:</b> {version}</p>
        <p><b>Platform:</b> {platform}</p>
        <hr />
        <p>
          <b>Egghead</b> is a browser extension developed by Cam Feenstra with the
          goal of helping you get value from your browser history.
        </p>
        <p>
          The default chrome browser history does not offer very useful search
          functionality, and it doesn{"'"}t let you do simple things like understand
          which links you opened on a given page. Egghead is designed to fix these
          problems. I{"'"}ve found it useful so far, and I hope you do.
        </p>
        <p>
          Egghead is completely open source, and you can find the code in the
          {' '}<a href="https://github.com/cfeenstra67/egghead" target="_blank" rel="noreferrer">Github repo</a>.
        </p>
        <p>
          If you have problems using the app, or encounter any bugs, please open an
          issue on the Github repo or contact me at{' '}
          <a href="me@camfeenstra.com">me@camfeenstra.com</a>.
        </p>
      </Card>
    </Layout>
  )
}
