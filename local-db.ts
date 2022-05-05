import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { migrations } from './src/migrations';
import { entities } from './src/models';

export const sqlDataSource = new DataSource({
  type: 'sqlite',
  database: './history.db',
  entities,
  migrations
});
