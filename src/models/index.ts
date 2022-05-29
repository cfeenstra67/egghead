import {
  Session,
  SessionIndex,
  SessionTermIndex,
  SessionTermIndexVocab,
} from "./session.entity";

// All entities to be queried
export const entities = [
  Session,
  SessionIndex,
  SessionTermIndex,
  SessionTermIndexVocab,
];

// Entities to be included in migrations
export const migrationEntities = [Session];

export * from "./session.entity";
