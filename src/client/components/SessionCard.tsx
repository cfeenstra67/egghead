import { BinaryOperator } from "@/src/server/clause";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { DeleteSessionsRequest, SessionResponse } from "../../server";
import { getFaviconUrlPublicApi } from "../lib/favicon";
import { DeleteSessionModal } from "./DeleteSessionModal";
import ExternalLink from "./ExternalLink";
import { Button } from "./ui/button";

export interface SessionCardProps {
  session: SessionResponse;
  onDelete?: () => void;
}

export default function SessionCard({ session, onDelete }: SessionCardProps) {
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
      <div className="flex gap-6 items-center">
        <div className="p-6">
          <img
            src={getFaviconUrlPublicApi(url.hostname, imgSize)}
            width={imgSize}
            height={imgSize}
            alt="Favicon"
          />
        </div>
        <div className="flex flex-col gap-2">
          <ExternalLink
            newTab={true}
            href={session.rawUrl}
            tabId={session.endedAt ? undefined : session.tabId}
          >
            <h3 className="text-xl">{session.title}</h3>
            <span title={session.rawUrl}>{url.hostname}</span>
          </ExternalLink>

          <div>
            Spent <b>{durationMinutes.toFixed(2)}</b> minute(s) on this page
          </div>

          <div>
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
