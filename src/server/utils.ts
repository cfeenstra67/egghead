import { ServerMessage, ServerInterface } from './types';

type MethodMapping = {
  [ServerMessage.Hello]: ServerInterface["getHello"];
  [ServerMessage.Query]: ServerInterface["runQuery"];
};

export function methodMapping(server: ServerInterface): MethodMapping {
  return {
    [ServerMessage.Hello]: server.getHello.bind(server),
    [ServerMessage.Query]: server.runQuery.bind(server),
  };
}
