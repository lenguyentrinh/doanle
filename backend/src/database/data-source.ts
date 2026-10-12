import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './database-options';

export const AppDataSource = new DataSource({
  ...createDatabaseOptions(),
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
});
