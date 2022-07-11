import Card from "./Card";
import ExternalLink from "./ExternalLink";
import { getFaviconUrlPublicApi } from "../lib/favicon";
import type { SessionResponse } from "../../server";
import styles from "../styles/SessionCard.module.css";
import utilStyles from "../styles/utils.module.css";

export interface SessionCardProps {
  session: SessionResponse;
}

export default function SessionCard({ session }: SessionCardProps) {
  const url = new URL(session.rawUrl);

  const durationMinutes = session.interactionCount * 3 / 60;

  const lastInteraction = new Date(session.lastInteractionAt);

  return (
    <Card className={styles.sessionCard}>
      <img src={getFaviconUrlPublicApi(url.hostname, 48)}/>
      <div className={styles.content}>
        <ExternalLink
          newTab={true}
          href={session.rawUrl}
          tabId={session.endedAt ? undefined : session.tabId}
        >
          <h3
            className={`${utilStyles.inlineBlock} ${utilStyles.marginRight3}`}
          >
            {session.title}
          </h3>
          <span
            title={session.url}
            className={`${styles.host} ${utilStyles.inlineBlock}`}
          >
            {url.hostname}
          </span>
        </ExternalLink>

        <p>
          Spent <b>{durationMinutes.toFixed(2)}</b> minute(s)
          interacting with this page
        </p>

        <p>
          {`Last interacted on ${lastInteraction.toLocaleDateString()} at `}
          {`${lastInteraction.toLocaleTimeString()}`}
        </p>
      </div>
    </Card>
  );
}
