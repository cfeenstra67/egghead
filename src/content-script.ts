import {
  ExtensionMessage,
} from './types';
import { ServerClient } from './server/client';

import { processExtensionRequest, ExtensionClient } from './extension/client';

const extensionClient = new ExtensionClient(processExtensionRequest);

extensionClient
  .getHello({ message: 'Blah2' })
  .then((response: any) => {
    console.log("RESPONSE", response);
  }).catch((error: any) => {
    console.error("ERROR", error);
  });

const serverClient = new ServerClient(processExtensionRequest);

serverClient
  .runQuery({ query: `
SELECT
  *
FROM
  session
ORDER BY startedAt DESC
LIMIT 100
` })
  .then((response: any) => {
    console.log("RESPONSE2", response);
  }).catch((error: any) => {
    console.error("ERROR2", error);
  });

serverClient
  .getUsers({})
  .then(async (users) => {
    console.log("USERS", users);
  });
