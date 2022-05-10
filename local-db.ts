import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { migrations } from './src/migrations';
import { migrationEntities } from './src/models';

export const sqlDataSource = new DataSource({
  type: 'sqlite',
  database: './history.db',
  entities: migrationEntities,
  migrations
});
