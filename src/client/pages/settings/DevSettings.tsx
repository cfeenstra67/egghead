import { useState } from "react";
import DbTool from "../../components/DbTool";
import SettingsLayout from "../../components/SettingsLayout";
import { SettingsPage } from "../../components/SettingsSideBar";
import { useSettingsContext } from "../../lib/SettingsContext";

export default function DevSettings() {
  const settings = useSettingsContext();
  const [expanded, setExpanded] = useState(false);

  return (
    <SettingsLayout expanded={expanded} page={SettingsPage.Dev}>
      <h1 className="text-2xl font-semibold leading-none tracking-tight p-6">
        Dev Settings
      </h1>

      <div className="rounded-xl border shadow">
        <div className="p-6 flex flex-col gap-4 gap-y-6">
          {settings.items.devModeEnabled ? (
            <DbTool expanded={expanded} setExpanded={setExpanded} />
          ) : (
            <p>Dev mode not enabled.</p>
          )}
        </div>
      </div>
    </SettingsLayout>
  );
}
