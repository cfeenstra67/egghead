import { MigrationInterface, QueryRunner } from "typeorm";

export class session1651745331265 implements MigrationInterface {
    name = 'session1651745331265'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime)`);
        await queryRunner.query(`CREATE TABLE "temporary_session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt" FROM "session"`);
        await queryRunner.query(`DROP TABLE "session"`);
        await queryRunner.query(`ALTER TABLE "temporary_session" RENAME TO "session"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" RENAME TO "temporary_session"`);
        await queryRunner.query(`CREATE TABLE "session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime)`);
        await queryRunner.query(`INSERT INTO "session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt" FROM "temporary_session"`);
        await queryRunner.query(`DROP TABLE "temporary_session"`);
        await queryRunner.query(`DROP TABLE "session"`);
    }

}
