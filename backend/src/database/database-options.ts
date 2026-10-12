import { join } from 'path';
import type { DataSourceOptions } from 'typeorm';

export function createDatabaseOptions(
  env: Record<string, string | undefined> = process.env,
): DataSourceOptions {
  return {
    type: 'mysql',
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    username: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME || 'ecommerce',
    synchronize: false,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  };
}
