import clsx from "clsx";
import { SquareArrowOutUpRight } from "lucide-react";
import { Link } from "wouter";
import { useSettingsContext } from "../lib/SettingsContext.js";
import ExternalLink from "./ExternalLink.js";

export enum SettingsPage {
  General = "General",
  ImportExport = "ImportExport",
  Data = "Data",
  Dev = "Dev",
  Docs = "Docs",
  About = "About",
}

interface SettingsSideBarItemProps {
  url: string;
  title: string;
  className?: string;
}

function SettingsSideBarItem({
  url,
  title,
  className,
}: SettingsSideBarItemProps) {
  return (
    <Link href={url} className={className}>
      {title}
    </Link>
  );
}

function ExternalSettingsSideBarItem({
  url,
  title,
  className,
}: SettingsSideBarItemProps) {
  return (
    <ExternalLink href={url} newTab className={className}>
      <span>{title}</span>
      <SquareArrowOutUpRight className="h-4 w-4" />
    </ExternalLink>
  );
}

export interface SettingsSideBarProps {
  page: SettingsPage;
}

export default function SettingsSideBar({ page }: SettingsSideBarProps) {
  const settings = useSettingsContext();

  const className = (selected: boolean) =>
    clsx(
      "flex m-0 justify-start gap-3 items-center hover:bg-accent hover:text-accent-foreground p-2 rounded",
      { "bg-muted text-accent-foreground": selected },
    );

  return (
    <aside className="w-64 border-r bg-background p-4 space-y-2">
      <SettingsSideBarItem
        url="/settings"
        title="General"
        className={className(page === SettingsPage.General)}
      />
      <SettingsSideBarItem
        url="/settings/import-export"
        title="Data Import / Export"
        className={className(page === SettingsPage.ImportExport)}
      />
      <SettingsSideBarItem
        url="/about"
        title="About"
        className={className(page === SettingsPage.About)}
      />
      {settings.items.devModeEnabled ? (
        <SettingsSideBarItem
          url="/settings/dev"
          title="Dev Tools"
          className={className(page === SettingsPage.Dev)}
        />
      ) : null}
    </aside>
  );
}
