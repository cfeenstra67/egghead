import { MigrationInterface, QueryRunner } from "typeorm"

export class addChromeVisitIndex1660888026194 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "chromeVisitIndex" ON "session" ("chromeVisitId") WHERE tabId = -12`);
        await queryRunner.query(`CREATE INDEX "chromeReferringVisitIndex" ON "session" ("chromeReferringVisitId") WHERE tabId = -12`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "chromeVisitIndex"`);
        await queryRunner.query(`DROP INDEX "chromeReferringVisitIndex"`);
    }

}
