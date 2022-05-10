import { processExtensionRequest } from './extension/client';
import { ServerClient } from './server/client';

const serverClient = new ServerClient(processExtensionRequest);

serverClient
  .runQuery({ query: `
SELECT
  *
FROM
  session
ORDER BY startedAt DESC
LIMIT 10
` })
  .then((response: any) => {
    console.log("SESSIONS", response);
  }).catch((error: any) => {
    console.error("ERROR", error);
  });
