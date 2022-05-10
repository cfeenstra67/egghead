import { MigrationInterface, QueryRunner } from "typeorm"

export class searchIndex1652082981231 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE VIRTUAL TABLE "session_index" USING fts5(
                id UNINDEXED,
                tabId UNINDEXED,
                url,
                title,
                rawUrl,
                parentSessionId UNINDEXED,
                transitionType,
                startedAt UNINDEXED,
                endedAt UNINDEXED,
                content=session,
                content_rowid=rowid
            );
        `);
        await queryRunner.query(`
            INSERT INTO "session_index" (
                "rowid",
                "id",
                "tabId",
                "url",
                "title",
                "rawUrl",
                "parentSessionId",
                "transitionType",
                "startedAt",
                "endedAt"
            ) SELECT
                "rowid",
                "id",
                "tabId",
                "url",
                "title",
                "rawUrl",
                "parentSessionId",
                "transitionType",
                "startedAt",
                "endedAt"
            FROM "session";
        `);
        await queryRunner.query(`
            CREATE TRIGGER session_ai AFTER INSERT ON session BEGIN
                INSERT INTO "session_index" (
                    "rowid",
                    "id",
                    "tabId",
                    "url",
                    "title",
                    "rawUrl",
                    "parentSessionId",
                    "transitionType",
                    "startedAt",
                    "endedAt"
                ) VALUES (
                    new.rowid,
                    new.id,
                    new.tabId,
                    new.url,
                    new.title,
                    new.rawUrl,
                    new.parentSessionId,
                    new.transitionType,
                    new.startedAt,
                    new.endedAt
                );
            END;
            CREATE TRIGGER session_ad AFTER DELETE ON session BEGIN
                INSERT INTO "session_index" (
                    session_index,
                    "rowid",
                    "id",
                    "tabId",
                    "url",
                    "title",
                    "rawUrl",
                    "parentSessionId",
                    "transitionType",
                    "startedAt",
                    "endedAt"
                ) VALUES (
                    'delete',
                    new.rowid,
                    new.id,
                    new.tabId,
                    new.url,
                    new.title,
                    new.rawUrl,
                    new.parentSessionId,
                    new.transitionType,
                    new.startedAt,
                    new.endedAt
                );
            END;
            CREATE TRIGGER session_au AFTER UPDATE ON session BEGIN
                INSERT INTO "session_index" (
                    session_index,
                    "rowid",
                    "id",
                    "tabId",
                    "url",
                    "title",
                    "rawUrl",
                    "parentSessionId",
                    "transitionType",
                    "startedAt",
                    "endedAt"
                ) VALUES (
                    'delete',
                    old.rowid,
                    old.id,
                    old.tabId,
                    old.url,
                    old.title,
                    old.rawUrl,
                    old.parentSessionId,
                    old.transitionType,
                    old.startedAt,
                    old.endedAt
                );
                INSERT INTO "session_index" (
                    "rowid",
                    "id",
                    "tabId",
                    "url",
                    "title",
                    "rawUrl",
                    "parentSessionId",
                    "transitionType",
                    "startedAt",
                    "endedAt"
                ) VALUES (
                    new.rowid,
                    new.id,
                    new.tabId,
                    new.url,
                    new.title,
                    new.rawUrl,
                    new.parentSessionId,
                    new.transitionType,
                    new.startedAt,
                    new.endedAt
                );
            END;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS session_ai`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS session_au`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS session_ad`);
        await queryRunner.query(`DROP TABLE IF EXISTS "session_index";`);
    }

}
