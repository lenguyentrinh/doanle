import { MigrationInterface, QueryRunner } from 'typeorm';

// Single-row table (fixed id = 1, upserted by HomeHeroService) holding the
// configurable homepage hero. No row means "never configured" and the
// frontend falls back to its hardcoded default.
export class CreateHomeHero1789400000000 implements MigrationInterface {
  name = 'CreateHomeHero1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('home_hero');
    if (!table) {
      await queryRunner.query(`
        CREATE TABLE \`home_hero\` (
          \`id\` int NOT NULL,
          \`template\` varchar(20) NOT NULL,
          \`eyebrow\` varchar(80) NOT NULL,
          \`title\` varchar(200) NOT NULL,
          \`subtitle\` varchar(500) NOT NULL,
          \`primaryCta\` json NOT NULL,
          \`secondaryCta\` json NOT NULL,
          \`images\` json NOT NULL,
          \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('home_hero');
    if (table) {
      await queryRunner.query(`DROP TABLE \`home_hero\``);
    }
  }
}
