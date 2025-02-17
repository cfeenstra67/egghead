import { useMutation } from "@tanstack/react-query";
import { useContext, useRef } from "react";
import SettingsLayout from "../../components/SettingsLayout";
import SettingsOptionStatus, {
  LoadingState,
} from "../../components/SettingsOptionStatus";
import { SettingsPage } from "../../components/SettingsSideBar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { AppContext, cleanupUrl, downloadUrl } from "../../lib";

export default function ImportExport() {
  const { serverClientFactory } = useContext(AppContext);
  const ref = useRef<HTMLInputElement | null>(null);

  const exportDatabase = useMutation({
    mutationKey: ["exportDatabase"],
    mutationFn: async () => {
      const client = await serverClientFactory();

      return await client.exportDatabase({});
    },
    onSuccess: ({ databaseUrl }) => {
      downloadUrl(databaseUrl, "history.db");
      cleanupUrl(databaseUrl);
    },
  });

  const importDatabase = useMutation({
    mutationKey: ["importDatabase"],
    mutationFn: async (url: string) => {
      const client = await serverClientFactory();

      return await client.importDatabase({
        databaseUrl: url,
      });
    },
    onSuccess: () => {
      if (ref.current) {
        ref.current.value = "";
      }
    },
  });

  return (
    <SettingsLayout page={SettingsPage.ImportExport}>
      <div className="flex flex-col space-y-1.5 p-6">
        <h1 className="font-semibold leading-none tracking-tight text-2xl">
          Data Import / Export
        </h1>
      </div>
      <div className="rounded-xl border shadow p-6 grid grid-cols-[1fr_auto] items-center gap-4 gap-y-6">
        <div>
          <Label htmlFor="export" className="text-base font-semibold">
            Export Database
          </Label>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => exportDatabase.mutate()}
            disabled={exportDatabase.status === "pending"}
          >
            Export
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {
            "Export all of your browsing data; you can re-import this into Egghead in the future."
          }
        </div>
        <div />
        <div />
        <div />
        <div className="flex flex-col gap-6 col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="import" className="text-base font-semibold">
              Import Database
            </Label>
            {importDatabase.status !== "idle" &&
            importDatabase.status !== "pending" ? (
              <SettingsOptionStatus
                state={
                  importDatabase.status === "success"
                    ? LoadingState.Success
                    : LoadingState.Failed
                }
              />
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground">
            Import a database that you've exported using the feature above in
            the past. <strong>This will replace your existing database.</strong>
          </div>
          <div>
            <Input
              type="file"
              id="import"
              className="w-full cursor-pointer"
              ref={ref}
              onChange={(evt) => {
                const file = evt.target.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  importDatabase.mutate(url);
                }
              }}
            />
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
