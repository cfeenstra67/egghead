import { MigrationInterface, QueryRunner } from "typeorm";
import { createFts5Index, dropFts5Index, Fts5TableArgs } from "../models/fts5";

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
  ],
  contentTableName: "session",
  contentRowId: "rowid",
};

export class searchIndex1652082981231 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await createFts5Index(sessionIndex, queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropFts5Index(sessionIndex, queryRunner);
  }
}
