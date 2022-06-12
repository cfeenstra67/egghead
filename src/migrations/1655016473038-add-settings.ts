import { MigrationInterface, QueryRunner } from "typeorm";

export class addSettings1655016473038 implements MigrationInterface {
    name = 'addSettings1655016473038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "settings" ("id" varchar PRIMARY KEY NOT NULL, "dataCollectionEnabled" boolean NOT NULL, "devModeEnabled" boolean NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "settings"`);
    }

}
