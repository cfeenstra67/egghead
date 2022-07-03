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
  ],
  contentTableName: "session",
  contentRowId: "rowid",
  tokenize: "unicode61",
};

const indexes = [sessionIndex, termIndex];

export class addChromeVisitId1656829928767 implements MigrationInterface {
    name = 'addChromeVisitId1656829928767'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.commitTransaction();
        await queryRunner.query("PRAGMA foreign_keys=OFF;");
        await queryRunner.startTransaction();

        await queryRunner.query(`DROP INDEX "IDX_daf40f40664690f95ccbdd5aca"`);
        await queryRunner.query(`DROP INDEX "IDX_8d37cf0b6f46991ec4ed617611"`);
        await queryRunner.query(`CREATE TABLE "temporary_session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, "nextSessionId" varchar, "host" varchar, "dum" varchar, "interactionCount" integer NOT NULL, "lastInteractionAt" datetime NOT NULL, "chromeVisitId" varchar, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "host", "dum", "interactionCount", "lastInteractionAt") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "host", "dum", "interactionCount", "lastInteractionAt" FROM "session"`);
        await queryRunner.query(`DROP TABLE "session"`);
        await queryRunner.query(`ALTER TABLE "temporary_session" RENAME TO "session"`);
        await queryRunner.query(`CREATE INDEX "IDX_daf40f40664690f95ccbdd5aca" ON "session" ("parentSessionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8d37cf0b6f46991ec4ed617611" ON "session" ("nextSessionId") `);
        for (const index of indexes) {
          await dropFts5Index(index, queryRunner);
          await createFts5Index(index, queryRunner);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const index of indexes.slice().reverse()) {
          await dropFts5Index(index, queryRunner);
        }
        await queryRunner.query(`DROP INDEX "IDX_8d37cf0b6f46991ec4ed617611"`);
        await queryRunner.query(`DROP INDEX "IDX_daf40f40664690f95ccbdd5aca"`);
        await queryRunner.query(`ALTER TABLE "session" RENAME TO "temporary_session"`);
        await queryRunner.query(`CREATE TABLE "session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, "nextSessionId" varchar, "host" varchar, "dum" varchar, "interactionCount" integer NOT NULL, "lastInteractionAt" datetime NOT NULL, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "host", "dum", "interactionCount", "lastInteractionAt") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "host", "dum", "interactionCount", "lastInteractionAt" FROM "temporary_session"`);
        await queryRunner.query(`DROP TABLE "temporary_session"`);
        await queryRunner.query(`CREATE INDEX "IDX_8d37cf0b6f46991ec4ed617611" ON "session" ("nextSessionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_daf40f40664690f95ccbdd5aca" ON "session" ("parentSessionId") `);
    }

}
