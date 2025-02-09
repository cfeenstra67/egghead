import { useState } from "react";
import DbTool from "../../components/DbTool";
import Layout from "../../components/Layout";
import SettingsSideBar, {
  SettingsPage,
} from "../../components/SettingsSideBar";
import { useSettingsContext } from "../../lib/SettingsContext";
import { cn } from "../../lib/utils";

export default function DevSettings() {
  const settings = useSettingsContext();
  const [expanded, setExpanded] = useState(false);

  return (
    <Layout>
      <div className="flex flex-1 overflow-hidden">
        <SettingsSideBar page={SettingsPage.Dev} />

        <main
          className={cn("flex-1 overflow-hidden p-4", {
            "max-w-[700px] mx-auto": !expanded,
          })}
        >
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
        </main>
      </div>
    </Layout>
  );
}
