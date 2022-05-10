import { Session, SessionIndex } from './session.entity';
import { User } from './user.entity';

// All entities to be queried
export const entities = [
  User,
  Session,
  SessionIndex,
];

// Entities to be included in migrations
export const migrationEntities = [
  User,
  Session,
];

export * from './session.entity';
export * from './user.entity';
