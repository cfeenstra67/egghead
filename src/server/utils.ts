import { ServerMessage, ServerInterface } from './types';

type MethodMapping = {
  [ServerMessage.Hello]: ServerInterface["getHello"];
  [ServerMessage.Query]: ServerInterface["runQuery"];
  [ServerMessage.CreateUser]: ServerInterface["createUser"];
  [ServerMessage.GetUsers]: ServerInterface["getUsers"];
};

export function methodMapping(server: ServerInterface): MethodMapping {
  return {
    [ServerMessage.Hello]: server.getHello.bind(server),
    [ServerMessage.Query]: server.runQuery.bind(server),
    [ServerMessage.CreateUser]: server.createUser.bind(server),
    [ServerMessage.GetUsers]: server.getUsers.bind(server),
  };
}
