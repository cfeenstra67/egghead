import { ServerMessage, ServerInterface } from './types';

type MethodMapping = {
  [ServerMessage.Hello]: ServerInterface["getHello"];
  [ServerMessage.Query]: ServerInterface["runQuery"];
  [ServerMessage.CreateUser]: ServerInterface["createUser"];
  [ServerMessage.GetUsers]: ServerInterface["getUsers"];
  [ServerMessage.StartSession]: ServerInterface["startSession"];
  [ServerMessage.EndSession]: ServerInterface["endSession"];
  [ServerMessage.QuerySessions]: ServerInterface["querySessions"];
  [ServerMessage.ExportDatabase]: ServerInterface["exportDatabase"];
};

export function methodMapping(server: ServerInterface): MethodMapping {
  return {
    [ServerMessage.Hello]: server.getHello.bind(server),
    [ServerMessage.Query]: server.runQuery.bind(server),
    [ServerMessage.CreateUser]: server.createUser.bind(server),
    [ServerMessage.GetUsers]: server.getUsers.bind(server),
    [ServerMessage.StartSession]: server.startSession.bind(server),
    [ServerMessage.EndSession]: server.endSession.bind(server),
    [ServerMessage.QuerySessions]: server.querySessions.bind(server),
    [ServerMessage.ExportDatabase]: server.exportDatabase.bind(server),
  };
}
