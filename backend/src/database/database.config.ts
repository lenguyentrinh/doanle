import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createDatabaseOptions } from './database-options';
import { MigrationGuard } from './migration-guard';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...createDatabaseOptions({
          DB_HOST: config.get<string>('DB_HOST'),
          DB_PORT: config.get<string>('DB_PORT'),
          DB_USERNAME: config.get<string>('DB_USERNAME'),
          DB_PASSWORD: config.get<string>('DB_PASSWORD'),
          DB_NAME: config.get<string>('DB_NAME'),
        }),
        autoLoadEntities: true,
        // Migrations are intentionally NOT auto-run at startup.
        // They must be applied manually via `pnpm migration:run` as part of
        // the release process BEFORE deploying a new app version.
        // MigrationGuard (registered below) enforces this by failing fast in
        // production when pending migrations are detected.
        migrationsRun: false,
      }),
    }),
  ],
  providers: [MigrationGuard],
})
export class DatabaseModule {}
