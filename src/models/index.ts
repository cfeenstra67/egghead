import { Session } from './session.entity';
import { User } from './user.entity';

export const entities = [
  User,
  Session,
];

export * from './session.entity';
export * from './user.entity';
