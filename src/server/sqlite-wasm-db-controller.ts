import { AbstractDBController } from "./abstract-db-controller";
import { SQLConnection } from "./sql-primitives";
import sqlite3InitModule, { Sqlite3Static } from '@sqlite.org/sqlite-wasm';

const ddl = `
CREATE TABLE IF NOT EXISTS "settings" ("id" varchar PRIMARY KEY NOT NULL, "dataCollectionEnabled" boolean NOT NULL, "devModeEnabled" boolean NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "theme" varchar NOT NULL, "retentionPolicyMonths" integer NOT NULL);
CREATE TABLE IF NOT EXISTS "session" ("id" varchar PRIMARY KEY NOT NULL, "tabId" integer NOT NULL, "url" varchar NOT NULL, "title" varchar NOT NULL, "rawUrl" varchar NOT NULL, "parentSessionId" varchar, "transitionType" varchar, "startedAt" datetime NOT NULL, "endedAt" datetime, "nextSessionId" varchar, "host" varchar, "dum" varchar, "interactionCount" integer NOT NULL, "lastInteractionAt" datetime NOT NULL, "chromeVisitId" varchar, "chromeReferringVisitId" varchar, CONSTRAINT "FK_daf40f40664690f95ccbdd5aca6" FOREIGN KEY ("parentSessionId") REFERENCES "session" ("id") ON DELETE SET NULL ON UPDATE NO ACTION);
CREATE INDEX IF NOT EXISTS "chromeReferringVisitIndex" ON "session" ("chromeReferringVisitId") WHERE tabId = -12;
CREATE INDEX IF NOT EXISTS "chromeVisitIndex" ON "session" ("chromeVisitId") WHERE tabId = -12;
CREATE INDEX IF NOT EXISTS "IDX_daf40f40664690f95ccbdd5aca" ON "session" ("parentSessionId") ;
CREATE INDEX IF NOT EXISTS "IDX_8d37cf0b6f46991ec4ed617611" ON "session" ("nextSessionId") ;
CREATE INDEX IF NOT EXISTS "IDX_b2d9159d6bfda41085c16a0deb" ON "session" ("host", "startedAt") ;
CREATE INDEX IF NOT EXISTS "IDX_33a8db3b2e1ae788ff9c8371c6" ON "session" ("chromeVisitId", "startedAt", "url") ;
CREATE INDEX IF NOT EXISTS "IDX_c1af0b097117c9e0afe88f20af" ON "session" ("tabId", "startedAt") ;
CREATE VIRTUAL TABLE IF NOT EXISTS "session_index" USING fts5( "id" UNINDEXED, "tabId" UNINDEXED, "host", "url", "title", "rawUrl", "parentSessionId" UNINDEXED, "transitionType", "startedAt" UNINDEXED, "endedAt" UNINDEXED, "nextSessionId" UNINDEXED, "interactionCount" UNINDEXED, "lastInteractionAt" UNINDEXED, "chromeVisitId" UNINDEXED, "chromeReferringVisitId" UNINDEXED, "dum" , content="session" , content_rowid="rowid" , tokenize='trigram' );
CREATE TABLE IF NOT EXISTS 'session_index_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'session_index_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'session_index_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'session_index_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE VIRTUAL TABLE IF NOT EXISTS "session_index_vocab" USING fts5vocab( session_index, instance );
CREATE TRIGGER IF NOT EXISTS "session_index_ai" AFTER INSERT ON "session" BEGIN INSERT INTO "session_index" ( "rowid", "id", "tabId", "host", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "interactionCount", "lastInteractionAt", "chromeVisitId", "chromeReferringVisitId", "dum" ) VALUES ( new."rowid", new."id", new."tabId", new."host", new."url", new."title", new."rawUrl", new."parentSessionId", new."transitionType", new."startedAt", new."endedAt", new."nextSessionId", new."interactionCount", new."lastInteractionAt", new."chromeVisitId", new."chromeReferringVisitId", 'dum' ); END;
CREATE TRIGGER IF NOT EXISTS "session_index_au" AFTER UPDATE ON "session" BEGIN INSERT INTO "session_index" ( "session_index",  "rowid", "id", "tabId", "host", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "interactionCount", "lastInteractionAt", "chromeVisitId", "chromeReferringVisitId", "dum" ) VALUES ('delete',  old."rowid", old."id", old."tabId", old."host", old."url", old."title", old."rawUrl", old."parentSessionId", old."transitionType", old."startedAt", old."endedAt", old."nextSessionId", old."interactionCount", old."lastInteractionAt", old."chromeVisitId", old."chromeReferringVisitId", 'dum' ); INSERT INTO "session_index" ( "rowid", "id", "tabId", "host", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "interactionCount", "lastInteractionAt", "chromeVisitId", "chromeReferringVisitId", "dum" ) VALUES ( new."rowid", new."id", new."tabId", new."host", new."url", new."title", new."rawUrl", new."parentSessionId", new."transitionType", new."startedAt", new."endedAt", new."nextSessionId", new."interactionCount", new."lastInteractionAt", new."chromeVisitId", new."chromeReferringVisitId", 'dum' ); END;
CREATE TRIGGER IF NOT EXISTS "session_index_ad" AFTER DELETE ON "session" BEGIN INSERT INTO "session_index" ( "session_index",  "rowid", "id", "tabId", "host", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "interactionCount", "lastInteractionAt", "chromeVisitId", "chromeReferringVisitId", "dum" ) VALUES ('delete',  old."rowid", old."id", old."tabId", old."host", old."url", old."title", old."rawUrl", old."parentSessionId", old."transitionType", old."startedAt", old."endedAt", old."nextSessionId", old."interactionCount", old."lastInteractionAt", old."chromeVisitId", old."chromeReferringVisitId", 'dum' ); END;
CREATE VIRTUAL TABLE IF NOT EXISTS "session_term_index" USING fts5( "id" UNINDEXED, "tabId" UNINDEXED, "host", "url", "title", "rawUrl", "parentSessionId" UNINDEXED, "transitionType", "startedAt" UNINDEXED, "endedAt" UNINDEXED, "nextSessionId" UNINDEXED, "interactionCount" UNINDEXED, "lastInteractionAt" UNINDEXED, "chromeVisitId" UNINDEXED, "chromeReferringVisitId" UNINDEXED, "dum" , content="session" , content_rowid="rowid" , tokenize='unicode61' );
CREATE TABLE IF NOT EXISTS 'session_term_index_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'session_term_index_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'session_term_index_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'session_term_index_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE VIRTUAL TABLE IF NOT EXISTS "session_term_index_vocab" USING fts5vocab( session_term_index, instance );
CREATE TRIGGER IF NOT EXISTS "session_term_index_ai" AFTER INSERT ON "session" BEGIN INSERT INTO "session_term_index" ( "rowid", "id", "tabId", "host", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "interactionCount", "lastInteractionAt", "chromeVisitId", "chromeReferringVisitId", "dum" ) VALUES ( new."rowid", new."id", new."tabId", new."host", new."url", new."title", new."rawUrl", new."parentSessionId", new."transitionType", new."startedAt", new."endedAt", new."nextSessionId", new."interactionCount", new."lastInteractionAt", new."chromeVisitId", new."chromeReferringVisitId", 'dum' ); END;
CREATE TRIGGER IF NOT EXISTS "session_term_index_au" AFTER UPDATE ON "session" BEGIN INSERT INTO "session_term_index" ( "session_term_index",  "rowid", "id", "tabId", "host", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "interactionCount", "lastInteractionAt", "chromeVisitId", "chromeReferringVisitId", "dum" ) VALUES ('delete',  old."rowid", old."id", old."tabId", old."host", old."url", old."title", old."rawUrl", old."parentSessionId", old."transitionType", old."startedAt", old."endedAt", old."nextSessionId", old."interactionCount", old."lastInteractionAt", old."chromeVisitId", old."chromeReferringVisitId", 'dum' ); INSERT INTO "session_term_index" ( "rowid", "id", "tabId", "host", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "interactionCount", "lastInteractionAt", "chromeVisitId", "chromeReferringVisitId", "dum" ) VALUES ( new."rowid", new."id", new."tabId", new."host", new."url", new."title", new."rawUrl", new."parentSessionId", new."transitionType", new."startedAt", new."endedAt", new."nextSessionId", new."interactionCount", new."lastInteractionAt", new."chromeVisitId", new."chromeReferringVisitId", 'dum' ); END;
CREATE TRIGGER IF NOT EXISTS "session_term_index_ad" AFTER DELETE ON "session" BEGIN INSERT INTO "session_term_index" ( "session_term_index",  "rowid", "id", "tabId", "host", "url", "title", "rawUrl", "parentSessionId", "transitionType", "startedAt", "endedAt", "nextSessionId", "interactionCount", "lastInteractionAt", "chromeVisitId", "chromeReferringVisitId", "dum" ) VALUES ('delete',  old."rowid", old."id", old."tabId", old."host", old."url", old."title", old."rawUrl", old."parentSessionId", old."transitionType", old."startedAt", old."endedAt", old."nextSessionId", old."interactionCount", old."lastInteractionAt", old."chromeVisitId", old."chromeReferringVisitId", 'dum' ); END;
`;

export class SQLiteWASMDBController extends AbstractDBController {
  private sqlite3: Sqlite3Static | null = null;

  constructor(readonly path: string) {
    super();
  }

  protected async createConnection(): Promise<SQLConnection> {
    this.sqlite3 = await sqlite3InitModule({
      print: (msg) => console.log('SQLITE LOG', msg),
      printErr: (msg) => console.error('SQLITE ERROR', msg)
    });

    const db = new this.sqlite3.oo1.OpfsDb(this.path);

    const returnFunc = ((query, parameters) => {
      return new Promise((resolve, reject) => {
        try {
          const rows: any[] = [];

          const params: any[] = [];
          for (const p of parameters ?? []) {
            if (p instanceof Date) {
              params.push(p.toISOString());
            } else {
              params.push(p);
            }
          }

          db.exec({
            sql: query,
            bind: params,
            rowMode: 'object',
            callback: (row) => { rows.push(row) }
          });
          resolve(rows);
        } catch (error) {
          reject(error);
        }
      });
    }) as SQLConnection;

    returnFunc.close = async () => { db.close() };

    returnFunc.export = async () => {
      return this.sqlite3!.capi.sqlite3_js_db_export(db);
    };

    returnFunc.import = async (data) => {
      await this.sqlite3!.oo1.OpfsDb.importDb(this.path, data);
    };

    const statements = ddl.trim().split('\n');
    for (const statement of statements) {
      await returnFunc(statement);
    }

    return returnFunc;
  }

  async reset(): Promise<void> {
    const dir = await navigator.storage.getDirectory();
    await dir.removeEntry(this.path);
    await this.teardownDb();
    await this.initializeDb();
  }
}
