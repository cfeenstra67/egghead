import { MigrationInterface, QueryRunner } from "typeorm";

export class dummyColumn1653238599617 implements MigrationInterface {
  name = "dummyColumn1653238599617";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "session" ADD COLUMN "dum" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "dum";`);
  }
}
