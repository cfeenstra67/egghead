import { MigrationInterface, QueryRunner } from "typeorm";
import { createFts5Index, dropFts5Index, Fts5TableArgs } from "../models/fts5";

const sessionIndex: Fts5TableArgs = {
  tableName: "session_index",
  columns: [
    ["id", false],
    ["tabId", false],
    "host",
    "url",
    "title",
    "rawUrl",
    ["parentSessionId", false],
    "transitionType",
    ["startedAt", false],
    ["endedAt", false],
    ["nextSessionId", false],
    ["interactionCount", false],
    ["lastInteractionAt", false],
    ["chromeVisitId", false],
    ["chromeReferringVisitId", false],
  ],
  contentTableName: "session",
  contentRowId: "rowid",
  tokenize: "trigram",
};

const termIndex: Fts5TableArgs = {
  tableName: "session_term_index",
  columns: [
    ["id", false],
    ["tabId", false],
    "host",
    "url",
    "title",
    "rawUrl",
    ["parentSessionId", false],
    "transitionType",
    ["startedAt", false],
    ["endedAt", false],
    ["nextSessionId", false],
    ["interactionCount", false],
    ["lastInteractionAt", false],
    ["chromeVisitId", false],
    ["chromeReferringVisitId", false],
  ],
  contentTableName: "session",
  contentRowId: "rowid",
  tokenize: "unicode61",
};

const indexes = [sessionIndex, termIndex];

export class addChromeReferringVisitColumn1660499472193 implements MigrationInterface {
    name = 'addChromeReferringVisitColumn1660499472193'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.commitTransaction();
        await queryRunner.query("PRAGMA foreign_keys=OFF;");
        await queryRunner.startTransaction();

        await queryRunner.query(`DROP INDEX "IDX_c1af0b097117c9e0afe88f20af"`);
        await queryRunner.query(`DROP INDEX "IDX_33a8db3b2e1ae788ff9c8371c6"`);
        await queryRunner.query(`DROP INDEX "IDX_b2d9159d6bfda41085c16a0deb"`);
        await queryRunner.query(`DROP INDEX "IDX_8d37cf0b6f46991ec4ed617611"`);
        await queryRunner.query(`DROP INDEX "IDX_daf40f40664690f95ccbdd5aca"`);
        await queryRunner.query(`CREATE TABLE "temporary_session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, "nextSessionId" varchar, "host" varchar, "dum" varchar, "interactionCount" integer NOT NULL, "lastInteractionAt" datetime NOT NULL, "chromeVisitId" varchar, "chromeReferringVisitId" varchar, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "host", "dum", "interactionCount", "lastInteractionAt", "chromeVisitId") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "host", "dum", "interactionCount", "lastInteractionAt", "chromeVisitId" FROM "session"`);
        await queryRunner.query(`DROP TABLE "session"`);
        await queryRunner.query(`ALTER TABLE "temporary_session" RENAME TO "session"`);
        await queryRunner.query(`CREATE INDEX "IDX_c1af0b097117c9e0afe88f20af" ON "session" ("tabId", "startedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_33a8db3b2e1ae788ff9c8371c6" ON "session" ("chromeVisitId", "startedAt", "url") `);
        await queryRunner.query(`CREATE INDEX "IDX_b2d9159d6bfda41085c16a0deb" ON "session" ("host", "startedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_8d37cf0b6f46991ec4ed617611" ON "session" ("nextSessionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_daf40f40664690f95ccbdd5aca" ON "session" ("parentSessionId") `);
        for (const index of indexes) {
          await dropFts5Index(index, queryRunner);
          await createFts5Index(index, queryRunner);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const index of indexes.slice().reverse()) {
          await dropFts5Index(index, queryRunner);
        }
        await queryRunner.query(`DROP INDEX "IDX_daf40f40664690f95ccbdd5aca"`);
        await queryRunner.query(`DROP INDEX "IDX_8d37cf0b6f46991ec4ed617611"`);
        await queryRunner.query(`DROP INDEX "IDX_b2d9159d6bfda41085c16a0deb"`);
        await queryRunner.query(`DROP INDEX "IDX_33a8db3b2e1ae788ff9c8371c6"`);
        await queryRunner.query(`DROP INDEX "IDX_c1af0b097117c9e0afe88f20af"`);
        await queryRunner.query(`ALTER TABLE "session" RENAME TO "temporary_session"`);
        await queryRunner.query(`CREATE TABLE "session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, "nextSessionId" varchar, "host" varchar, "dum" varchar, "interactionCount" integer NOT NULL, "lastInteractionAt" datetime NOT NULL, "chromeVisitId" varchar, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "host", "dum", "interactionCount", "lastInteractionAt", "chromeVisitId") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "host", "dum", "interactionCount", "lastInteractionAt", "chromeVisitId" FROM "temporary_session"`);
        await queryRunner.query(`DROP TABLE "temporary_session"`);
        await queryRunner.query(`CREATE INDEX "IDX_daf40f40664690f95ccbdd5aca" ON "session" ("parentSessionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8d37cf0b6f46991ec4ed617611" ON "session" ("nextSessionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b2d9159d6bfda41085c16a0deb" ON "session" ("host", "startedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_33a8db3b2e1ae788ff9c8371c6" ON "session" ("chromeVisitId", "startedAt", "url") `);
        await queryRunner.query(`CREATE INDEX "IDX_c1af0b097117c9e0afe88f20af" ON "session" ("tabId", "startedAt") `);
    }

}
