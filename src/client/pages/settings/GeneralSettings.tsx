import { Theme } from "@/src/server";
import { Input } from "../../components-v2/ui/input";
import { Label } from "../../components-v2/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components-v2/ui/select";
import { Switch } from "../../components-v2/ui/switch";
import Layout from "../../components/Layout";
import SettingsSideBar, {
  SettingsPage,
} from "../../components/SettingsSideBar";
import { useSettingsContext } from "../../lib/SettingsContext";

export default function Settings() {
  const settings = useSettingsContext();

  return (
    <Layout>
      <div className="flex flex-1 overflow-hidden">
        <SettingsSideBar page={SettingsPage.General} />

        <main className="flex-1 overflow-hidden p-4 max-w-[700px] mx-auto">
          <div className="flex flex-col space-y-1.5 p-6">
            <h1 className="font-semibold leading-none tracking-tight text-2xl">
              Settings
            </h1>
          </div>
          <div className="rounded-xl border shadow p-6 grid grid-cols-[1fr_auto] items-center gap-4 gap-y-6">
            <div>
              <Label htmlFor="theme" className="text-base font-semibold">
                Theme
              </Label>
            </div>
            <div className="min-w-24">
              <Select
                value={settings.items.theme}
                onValueChange={(value) => {
                  settings.patch({ theme: value as Theme });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Theme.Auto}>System</SelectItem>
                  <SelectItem value={Theme.Light}>Light</SelectItem>
                  <SelectItem value={Theme.Dark}>Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {'Change the look and feel of Egghead. Choosing "System" will '}
              {"respect your system-wide theme preference."}
            </div>
            <div />
            <div />
            <div />
            <div>
              <Label htmlFor="theme" className="text-base font-semibold">
                Retention Period (months)
              </Label>
            </div>
            <div className="min-w-24">
              <Input
                type="number"
                name="retention-policy"
                id="retention-policy"
                value={settings.items.retentionPolicyMonths}
                onChange={(evt) => {
                  settings.patch({
                    retentionPolicyMonths: Number.parseInt(evt.target.value),
                  });
                }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {
                "Specify how many months you'd like egghead to retain your data "
              }
              {
                "for. Reducing this can help improve search performance. Changing "
              }
              {"this setting will take up to one hour to take effect."}
            </div>
            <div />
            <div />
            <div />
            <div>
              <Label htmlFor="theme" className="text-base font-semibold">
                Dev Tools Enabled
              </Label>
            </div>
            <div className="min-w-24 flex justify-end">
              <Switch
                checked={settings.items.devModeEnabled}
                onCheckedChange={(value) => {
                  settings.patch({
                    devModeEnabled: value,
                  });
                }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {"Only enable this if you know what you're doing."}
            </div>
            <div />
          </div>
        </main>
      </div>
    </Layout>
  );
}
