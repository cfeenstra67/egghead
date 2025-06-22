import {
  Session,
  SessionIndex,
  SessionTermIndex,
  SessionTermIndexVocab,
} from "./session.entity.js";
import { Settings } from "./settings.entity.js";

// All entities to be queried
export const entities = [
  Session,
  SessionIndex,
  SessionTermIndex,
  SessionTermIndexVocab,
  Settings,
];

// Entities to be included in migrations
export const migrationEntities = [Session, Settings];

export * from "./session.entity";
export * from "./settings.entity";
