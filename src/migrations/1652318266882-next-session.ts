import { MigrationInterface, QueryRunner } from "typeorm";
import { createFts5Index, dropFts5Index, Fts5TableArgs } from "../models/fts5";

const oldSessionIndex: Fts5TableArgs = {
  tableName: "session_index",
  columns: [
    ["id", false],
    ["tabId", false],
    "url",
    "title",
    "rawUrl",
    ["parentSessionId", false],
    "transitionType",
    ["startedAt", false],
    ["endedAt", false],
  ],
  contentTableName: "session",
  contentRowId: "rowid",
};

const sessionIndex: Fts5TableArgs = {
  tableName: "session_index",
  columns: [
    ["id", false],
    ["tabId", false],
    "url",
    "title",
    "rawUrl",
    ["parentSessionId", false],
    "transitionType",
    ["startedAt", false],
    ["endedAt", false],
    ["nextSessionId", false],
  ],
  contentTableName: "session",
  contentRowId: "rowid",
  tokenize: "trigram",
};

export class nextSession1652318266882 implements MigrationInterface {
  name = "nextSession1652318266882";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.commitTransaction();
    await queryRunner.query("PRAGMA foreign_keys=OFF;");
    await queryRunner.startTransaction();

    await queryRunner.query(
      `CREATE TABLE "temporary_session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, "nextSessionId" varchar, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt" FROM "session"`
    );
    await dropFts5Index(sessionIndex, queryRunner);
    await queryRunner.query(`DROP TABLE "session"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_session" RENAME TO "session"`
    );
    await createFts5Index(sessionIndex, queryRunner);

    await queryRunner.commitTransaction();
    await queryRunner.query("PRAGMA foreign_keys=ON;");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropFts5Index(sessionIndex, queryRunner);
    await queryRunner.query(
      `ALTER TABLE "session" RENAME TO "temporary_session"`
    );
    await queryRunner.query(
      `CREATE TABLE "session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`
    );
    await queryRunner.query(
      `INSERT INTO "session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt" FROM "temporary_session"`
    );
    await createFts5Index(oldSessionIndex, queryRunner);
    await queryRunner.query(`PRAGMA foreign_keys = OFF`);
    await queryRunner.query(`DROP TABLE "temporary_session"`);
  }
}
