import { MigrationInterface, QueryRunner } from "typeorm";

export class moreIndexes1656901146387 implements MigrationInterface {
    name = 'moreIndexes1656901146387'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_33a8db3b2e1ae788ff9c8371c6" ON "session" ("chromeVisitId", "startedAt", "url") `);
        await queryRunner.query(`CREATE INDEX "IDX_c1af0b097117c9e0afe88f20af" ON "session" ("tabId", "startedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_c1af0b097117c9e0afe88f20af"`);
        await queryRunner.query(`DROP INDEX "IDX_33a8db3b2e1ae788ff9c8371c6"`);
    }

}
