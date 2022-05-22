declare module '@jlongster/sql.js';

declare module 'absurd-sql';

declare module 'absurd-sql/dist/indexeddb-backend';

declare module 'absurd-sql/dist/indexeddb-main-thread';

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
