declare module '@jlongster/sql.js';

declare module 'absurd-sql';

declare module 'absurd-sql/dist/indexeddb-backend';

declare module 'absurd-sql/dist/indexeddb-main-thread';

declare module 'wa-sqlite/src/examples/IDBVersionedVFS';

declare module '*.css';

declare module '*.svg';

declare module '*.db' {
  const content: string;
  export default content;
}

declare module '*.txt' {
  const content: string;
  export default content;
}

declare const LOG_LEVEL: string;

declare const DEV_MODE: boolean;

declare interface Navigator {
  locks: LockManager;
}
