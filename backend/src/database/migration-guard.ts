import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * MigrationGuard runs once at startup and logs a prominent warning (or throws
 * in production) when there are pending database migrations that have not yet
 * been applied.
 *
 * This guard exists because `migrationsRun` is intentionally set to `false` in
 * DatabaseModule — migrations must be run explicitly via `pnpm migration:run`
 * as part of the release process BEFORE deploying a new app version. Without
 * this guard, a missed migration step would cause silent runtime errors.
 *
 * Release checklist:
 *   1. Run `pnpm migration:show` to confirm pending migrations.
 *   2. Run `pnpm migration:run` against the target database.
 *   3. Verify the output shows "Migration <name> has been executed successfully."
 *   4. Deploy the new app version.
 *
 * @see backend/README.md — "Database Migrations" section
 */
@Injectable()
export class MigrationGuard implements OnApplicationBootstrap {
  private readonly logger = new Logger(MigrationGuard.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const pendingMigrations = await this.dataSource.showMigrations();

      if (pendingMigrations) {
        const message =
          'DATABASE OUT OF SYNC: There are pending migrations that have not been applied. ' +
          'Run `pnpm migration:run` before starting the application in production. ' +
          'See README.md for the full release checklist.';

        if (process.env.NODE_ENV === 'production') {
          // Fail fast in production — do not serve traffic on a stale schema.
          throw new Error(message);
        } else {
          // In development/staging, warn loudly but allow startup to continue
          // so developers can iterate without blocking local hot-reload.
          this.logger.warn(message);
        }
      } else {
        this.logger.log(
          'Database schema is up to date — no pending migrations.',
        );
      }
    } catch (err) {
      // Re-throw errors we explicitly threw above.
      if ((err as Error).message?.includes('DATABASE OUT OF SYNC')) {
        throw err;
      }
      // For unexpected errors (e.g. DB unreachable at boot), log and continue;
      // the application will fail naturally on first DB query.
      this.logger.error(
        `Could not check migration status: ${(err as Error).message}`,
      );
    }
  }
}
