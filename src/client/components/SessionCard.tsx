import { BinaryOperator } from "@/src/server/clause";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { DeleteSessionsRequest, SessionResponse } from "../../server";
import { useSettingsContext } from "../lib/SettingsContext";
import { getFaviconUrlPublicApi } from "../lib/favicon";
import { DeleteSessionModal } from "./DeleteSessionModal";
import ExternalLink from "./ExternalLink";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export interface SessionCardProps {
  session: SessionResponse;
  onDelete?: () => void;
}

export default function SessionCard({ session, onDelete }: SessionCardProps) {
  const settings = useSettingsContext();

  const url = new URL(session.rawUrl);
  const [showDelete, setShowDelete] = useState(false);

  const durationMinutes = (session.interactionCount * 3) / 60;

  const lastInteraction = new Date(session.lastInteractionAt);

  const imgSize = 48;

  const request: DeleteSessionsRequest = {
    filter: {
      operator: BinaryOperator.Equals,
      fieldName: "id",
      value: session.id,
    },
  };

  return (
    <>
      <DeleteSessionModal
        request={request}
        open={showDelete}
        onOpenChanged={(open) => setShowDelete(open)}
        onDelete={() => {
          setShowDelete(false);
          onDelete?.();
        }}
      />
      <div className="flex gap-6 items-center w-full">
        <div className="p-6">
          <img
            src={getFaviconUrlPublicApi(url.hostname, imgSize)}
            width={imgSize}
            height={imgSize}
            alt="Favicon"
          />
        </div>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <ExternalLink
            newTab={true}
            href={session.rawUrl}
            tabId={session.endedAt ? undefined : session.tabId}
            className="truncate"
          >
            <h3 className="text-xl truncate">{session.title}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate text-muted-foreground">
                  {settings.items.showFullUrls ? url.href : url.hostname}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[600px] text-wrap break-all">
                {session.rawUrl}
              </TooltipContent>
            </Tooltip>
          </ExternalLink>

          <div className="text-muted-foreground">
            Spent <b>{durationMinutes.toFixed(2)}</b> minute(s) on this page
          </div>

          <div className="text-muted-foreground">
            {`Last interacted on ${lastInteraction.toLocaleDateString()} at `}
            {`${lastInteraction.toLocaleTimeString()}`}
          </div>
        </div>
        <Button
          variant="destructive"
          className="ml-auto self-start cursor-pointer"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </>
  );
}
