import { MigrationInterface, QueryRunner } from "typeorm"
import { createFts5Index, dropFts5Index, Fts5TableArgs } from '../models/fts5';

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

const termIndex: Fts5TableArgs = {
    tableName: 'session_term_index',
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
    tokenize: 'unicode61',
}

const indexes = [sessionIndex, termIndex];

export class index1652947986280 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const index of indexes) {
            await dropFts5Index(index, queryRunner);
            await createFts5Index(index, queryRunner);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const index of indexes.slice().reverse()) {
            await dropFts5Index(index, queryRunner);
        }
    }

}
