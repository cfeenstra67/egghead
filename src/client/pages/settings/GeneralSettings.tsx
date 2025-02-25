import { Theme } from "@/src/server";
import SettingsLayout from "../../components/SettingsLayout";
import { SettingsPage } from "../../components/SettingsSideBar";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { useSettingsContext } from "../../lib/SettingsContext";

export default function Settings() {
  const settings = useSettingsContext();

  return (
    <SettingsLayout page={SettingsPage.General}>
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
            Show full URLs in Search
          </Label>
        </div>
        <div className="min-w-24 flex justify-end">
          <Switch
            checked={settings.items.showFullUrls}
            onCheckedChange={(value) => {
              settings.patch({
                showFullUrls: value,
              });
            }}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {
            "Show full URLs for each page in search results rather than only the host."
          }
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
          {"Specify how many months you'd like egghead to retain your data "}
          {"for. Reducing this can help improve search performance. Changing "}
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
    </SettingsLayout>
  );
}
