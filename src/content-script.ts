import {
  ExtensionMessage,
} from './types';
import { ServerClient } from './server/client';
import { ServerMessage } from './server/types';

import { processExtensionRequest } from './page-client';

processExtensionRequest({
  type: ExtensionMessage.Hello2,
  message: 'Blah',
}).then((response: any) => {
  console.log("RESPONSE", response);
}).catch((error: any) => {
  console.error("ERROR", error);
});

const serverClient = new ServerClient(processExtensionRequest);

serverClient.runQuery({ query: 'SELECT 1;' }).then((response: any) => {
  console.log("RESPONSE2", response);
}).catch((error: any) => {
  console.error("ERROR2", error);
});

serverClient
  .createUser({ name: 'Cam' })
  .then(async (response) => {
    console.log("Created", response.user);
    const users = await serverClient.getUsers({});
    console.log("USERS", users);
  });
