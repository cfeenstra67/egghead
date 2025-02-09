import { BinaryOperator } from "@/src/server/clause";
import { useState } from "react";
import { useLocation } from "wouter";
import type { DeleteSessionsRequest, SessionResponse } from "../../server";
import { Button } from "../components-v2/ui/button";
import { getFaviconUrlPublicApi } from "../lib/favicon";
import { DeleteSessionModal } from "./DeleteSessionModal";
import ExternalLink from "./ExternalLink";

export interface SessionCardProps {
  session: SessionResponse;
}

export default function SessionCard({ session }: SessionCardProps) {
  const url = new URL(session.rawUrl);
  const [_, setLocation] = useLocation();
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
        onDelete={() => setLocation("/")}
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
            Spent <b>{durationMinutes.toFixed(2)}</b> minute(s) interacting with
            this page
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
          Delete
        </Button>
      </div>
    </>
  );
}
