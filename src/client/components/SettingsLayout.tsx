import { useLocation } from "wouter";
import { cn } from "../lib/utils.js";
import Layout from "./Layout.js";
import type { SettingsPage } from "./SettingsSideBar.js";
import SettingsSideBar from "./SettingsSideBar.js";

export interface SettingsLayoutProps extends React.PropsWithChildren {
  page: SettingsPage;
  expanded?: boolean;
}

export default function SettingsLayout({
  children,
  page,
  expanded,
}: SettingsLayoutProps) {
  const [_, setLocation] = useLocation();

  return (
    <Layout onSearchFocus={() => setLocation("/")}>
      <div className="flex flex-1 overflow-hidden">
        <SettingsSideBar page={page} />

        <main
          className={cn("flex-1 overflow-hidden p-4", {
            "max-w-[700px] mx-auto": !expanded,
          })}
        >
          {children}
        </main>
      </div>
    </Layout>
  );
}
