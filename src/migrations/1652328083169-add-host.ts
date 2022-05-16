import { MigrationInterface, QueryRunner } from "typeorm";
import { createFts5Index, dropFts5Index, Fts5TableArgs } from '../models/fts5';

const oldSessionIndex: Fts5TableArgs = {
    tableName: 'session_index',
    columns: [
        ['id', false],
        ['tabId', false],
        'url',
        'title',
        'rawUrl',
        ['parentSessionId', false],
        'transitionType',
        ['startedAt', false],
        ['endedAt', false],
        ['nextSessionId', false],
    ],
    contentTableName: 'session',
    contentRowId: 'rowid',
    tokenize: 'trigram',
};

const sessionIndex: Fts5TableArgs = {
    tableName: 'session_index',
    columns: [
        ['id', false],
        ['tabId', false],
        'host',
        'url',
        'title',
        'rawUrl',
        ['parentSessionId', false],
        'transitionType',
        ['startedAt', false],
        ['endedAt', false],
        ['nextSessionId', false],
    ],
    contentTableName: 'session',
    contentRowId: 'rowid',
    tokenize: 'trigram',
};

export class addHost1652328083169 implements MigrationInterface {
    name = 'addHost1652328083169'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('PRAGMA foreign_keys=OFF;');
        await queryRunner.startTransaction();

        await queryRunner.query(`CREATE TABLE "temporary_session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, "nextSessionId" varchar, "host" varchar, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId" FROM "session"`);
        await dropFts5Index(sessionIndex, queryRunner);
        await queryRunner.query(`DROP TABLE "session"`);
        await queryRunner.query(`ALTER TABLE "temporary_session" RENAME TO "session"`);
        await createFts5Index(sessionIndex, queryRunner);
        await queryRunner.query(`CREATE INDEX "IDX_daf40f40664690f95ccbdd5aca" ON "session" ("parentSessionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8d37cf0b6f46991ec4ed617611" ON "session" ("nextSessionId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await dropFts5Index(sessionIndex, queryRunner);
        await queryRunner.query(`DROP INDEX "IDX_8d37cf0b6f46991ec4ed617611"`);
        await queryRunner.query(`DROP INDEX "IDX_daf40f40664690f95ccbdd5aca"`);
        await queryRunner.query(`ALTER TABLE "session" RENAME TO "temporary_session"`);
        await queryRunner.query(`CREATE TABLE "session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, "nextSessionId" varchar, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "session"("id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId") SELECT "id", "tabId", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId" FROM "temporary_session"`);
        await createFts5Index(oldSessionIndex, queryRunner);
        await queryRunner.query(`DROP TABLE "temporary_session"`);
    }

}
