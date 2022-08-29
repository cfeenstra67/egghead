import { MigrationInterface, QueryRunner } from "typeorm";

export class addRetentionPeriod1661633234964 implements MigrationInterface {
    name = 'addRetentionPeriod1661633234964'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_settings" ("id" varchar PRIMARY KEY NOT NULL, "dataCollectionEnabled" boolean NOT NULL, "devModeEnabled" boolean NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "theme" varchar NOT NULL, "retentionPolicyMonths" integer NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_settings"("id", "dataCollectionEnabled", "devModeEnabled", "createdAt", "updatedAt", "theme", "retentionPolicyMonths") SELECT "id", "dataCollectionEnabled", "devModeEnabled", "createdAt", "updatedAt", "theme", 3 FROM "settings"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`ALTER TABLE "temporary_settings" RENAME TO "settings"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settings" RENAME TO "temporary_settings"`);
        await queryRunner.query(`CREATE TABLE "settings" ("id" varchar PRIMARY KEY NOT NULL, "dataCollectionEnabled" boolean NOT NULL, "devModeEnabled" boolean NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "theme" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "settings"("id", "dataCollectionEnabled", "devModeEnabled", "createdAt", "updatedAt", "theme") SELECT "id", "dataCollectionEnabled", "devModeEnabled", "createdAt", "updatedAt", "theme" FROM "temporary_settings"`);
        await queryRunner.query(`DROP TABLE "temporary_settings"`);
    }

}
