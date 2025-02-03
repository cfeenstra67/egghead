import type { Table } from "./base";

export const sessionTable = {
  name: "session",
  columns: {
    id: { type: "varchar" },
    tabId: { type: "integer" },
    host: { type: "varchar", nullable: true },
    url: { type: "varchar" },
    title: { type: "varchar" },
    rawUrl: { type: "varchar" },
    parentSessionId: { type: "varchar", nullable: true },
    nextSessionId: { type: "varchar", nullable: true },
    transitionType: { type: "varchar", nullable: true },
    startedAt: { type: "datetime" },
    endedAt: { type: "datetime", nullable: true },
    interactionCount: { type: "integer" },
    lastInteractionAt: { type: "datetime" },
    chromeVisitId: { type: "varchar", nullable: true },
    chromeReferringVisitId: { type: "varchar", nullable: true },
    dum: { type: "varchar", nullable: true },
  },
} as const satisfies Table;

// @Entity()
// @Index(["host", "startedAt"])
// @Index(["tabId", "startedAt"])
// @Index(["chromeVisitId", "startedAt", "url"])
// @Index("chromeVisitIndex", { synchronize: false })
// @Index("chromeReferringVisitIndex", { synchronize: false })
export class Session {
  // @PrimaryColumn({ unique: true })
  id!: string;

  // @Column()
  tabId!: number;

  // @Column({ type: 'varchar', nullable: true })
  host!: string | null;

  // @Column()
  url!: string;

  // @Column()
  title!: string;

  // @Column()
  rawUrl!: string;

  // @Index()
  // @Column({ type: 'varchar', nullable: true })
  parentSessionId!: string | null;

  // @ManyToOne(() => Session, (session) => session.id, { onDelete: 'SET NULL' })
  // parentSession!: Promise<Session | null>;

  // @OneToMany(() => Session, (session) => session.parentSession)
  // childSessions: Promise<Session[]>;

  // @Index()
  // @Column({ type: 'varchar', nullable: true })
  nextSessionId!: string | null;

  // @OneToOne(() => Session, (session) => session.id, { onDelete: 'SET NULL' })
  // nextSession!: Promise<Session | null>;

  // @Column({ type: 'varchar', nullable: true })
  transitionType!: string | null;

  // @Column()
  startedAt!: Date;

  // @Column({ type: 'datetime', nullable: true })
  endedAt!: Date | null;

  // @Column()
  interactionCount!: number;

  // @Column()
  lastInteractionAt!: Date;

  // @Column({ type: 'varchar', nullable: true })
  chromeVisitId!: string | null;

  // @Column({ type: 'varchar', nullable: true })
  chromeReferringVisitId!: string | null;

  // Always null column used in search index as dummy
  // @Column({ type: 'varchar', nullable: true })
  dum!: string | null;
}

// @Entity("session_index")
export class SessionIndex extends Session {
  // @Column()
  rowid!: number;
}

export const sessionIndexTable = {
  ...sessionTable,
  name: "session_index",
} as const satisfies Table;

// @Entity("session_term_index")
export class SessionTermIndex extends Session {
  // @Column()
  rowid!: number;
}

export const sessionTermIndexTable = {
  ...sessionTable,
  name: "session_term_index",
} as const satisfies Table;

// @Entity("session_term_index_vocab")
export class SessionTermIndexVocab {
  // @PrimaryColumn()
  term!: string;
  // @PrimaryColumn()
  doc!: number;
  // @PrimaryColumn()
  col!: string;
  // @PrimaryColumn()
  offset!: number;
}
