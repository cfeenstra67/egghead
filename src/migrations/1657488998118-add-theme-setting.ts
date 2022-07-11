import { MigrationInterface, QueryRunner } from "typeorm";

export class addThemeSetting1657488998118 implements MigrationInterface {
    name = 'addThemeSetting1657488998118'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_settings" ("id" varchar PRIMARY KEY NOT NULL, "dataCollectionEnabled" boolean NOT NULL, "devModeEnabled" boolean NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "theme" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_settings"("id", "dataCollectionEnabled", "devModeEnabled", "createdAt", "updatedAt", "theme") SELECT "id", "dataCollectionEnabled", "devModeEnabled", "createdAt", "updatedAt", 'auto' FROM "settings"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`ALTER TABLE "temporary_settings" RENAME TO "settings"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settings" RENAME TO "temporary_settings"`);
        await queryRunner.query(`CREATE TABLE "settings" ("id" varchar PRIMARY KEY NOT NULL, "dataCollectionEnabled" boolean NOT NULL, "devModeEnabled" boolean NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`);
        await queryRunner.query(`INSERT INTO "settings"("id", "dataCollectionEnabled", "devModeEnabled", "createdAt", "updatedAt") SELECT "id", "dataCollectionEnabled", "devModeEnabled", "createdAt", "updatedAt" FROM "temporary_settings"`);
        await queryRunner.query(`DROP TABLE "temporary_settings"`);
    }

}
