import { platform, version } from "../../../constants";
import SettingsLayout from "../../components/SettingsLayout";
import { SettingsPage } from "../../components/SettingsSideBar";

export default function About() {
  return (
    <SettingsLayout page={SettingsPage.About}>
      <h1 className="text-2xl font-semibold leading-none tracking-tight p-6">
        About
      </h1>

      <div className="rounded-xl border shadow p-6 flex flex-col gap-4 gap-y-6">
        <div>
          <span className="font-bold">Version:</span> {version}
        </div>
        <div>
          <span className="font-bold">Platform:</span> {platform}
        </div>
        <p>
          <b>Egghead</b> is a browser extension developed by Cam Feenstra with
          the goal of helping you get value from your browser history.
        </p>
        <p>
          The default chrome browser history does not offer very useful search
          functionality, and it doesn{"'"}t let you do simple things like
          understand which links you opened on a given page. Egghead is designed
          to fix these problems. I{"'"}ve found it useful so far, and I hope you
          do.
        </p>
        <p>
          Egghead is completely open source, and you can find the code in the{" "}
          <a
            href="https://github.com/cfeenstra67/egghead"
            target="_blank"
            rel="noreferrer"
          >
            Github repo
          </a>
          .
        </p>
        <p>
          If you have problems using the app, or encounter any bugs, please open
          an issue on the Github repo or contact me at{" "}
          <a href="me@camfeenstra.com">me@camfeenstra.com</a>.
        </p>
      </div>
    </SettingsLayout>
  );
}
