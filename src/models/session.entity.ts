import {
  PrimaryColumn,
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';

@Entity()
export class Session {

  @PrimaryColumn({ unique: true })
  id!: string;

  @Column()
  tabId!: number;

  @Column({ nullable: true })
  host?: string;

  @Column()
  url!: string;

  @Column()
  title!: string;

  @Column()
  rawUrl!: string;

  @Index()
  @Column({ nullable: true })
  parentSessionId?: string;

  @ManyToOne(() => Session, session => session.id)
  parentSession?: Session;

  @OneToMany(() => Session, session => session.parentSession)
  childSessions: Session[];

  @Index()
  @Column({ nullable: true })
  nextSessionId?: string;

  @OneToOne(() => Session, session => session.id)
  nextSession?: Session;

  @Column({ nullable: true })
  transitionType?: string;

  @Column()
  startedAt!: Date;

  @Column({ nullable: true })
  endedAt?: Date;

  // Always null column used in search index as dummy
  @Column({ nullable: true })
  dum?: string;

}

@Entity('session_index')
export class SessionIndex extends Session {

  @Column()
  rowid!: number;

}

@Entity('session_term_index')
export class SessionTermIndex extends Session {

  @Column()
  rowid!: number;

}

@Entity('session_term_index_vocab')
export class SessionTermIndexVocab {
  @PrimaryColumn()
  term!: string;
  @PrimaryColumn()
  doc!: number;
  @PrimaryColumn()
  col!: string;
  @PrimaryColumn()
  offset!: number;
}
