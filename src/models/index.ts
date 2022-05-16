import { Session, SessionIndex } from './session.entity';

// All entities to be queried
export const entities = [
  Session,
  SessionIndex,
];

// Entities to be included in migrations
export const migrationEntities = [
  Session,
];

export * from './session.entity';
