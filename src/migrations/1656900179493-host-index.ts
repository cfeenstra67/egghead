import { MigrationInterface, QueryRunner } from "typeorm";

export class hostIndex1656900179493 implements MigrationInterface {
    name = 'hostIndex1656900179493'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_b2d9159d6bfda41085c16a0deb" ON "session" ("host", "startedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_b2d9159d6bfda41085c16a0deb"`);
    }

}
