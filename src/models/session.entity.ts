import { PrimaryColumn, Entity, Column, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class Session {

  @PrimaryColumn({ unique: true })
  id!: string;

  @Column()
  tabId!: number;

  @Column()
  url!: string;

  @Column()
  title!: string;

  @Column()
  rawUrl!: string;

  @Column({ nullable: true })
  parentSessionId?: string;

  @ManyToOne(() => Session, session => session.id)
  parentSession?: Session;

  @OneToMany(() => Session, session => session.parentSession)
  childSessions: Session[];

  @Column({ nullable: true })
  transitionType!: string;

  @Column()
  startedAt!: Date;

  @Column({ nullable: true })
  endedAt?: Date;

}

@Entity('session_index')
export class SessionIndex extends Session {

  @Column()
  rowid!: number;

}
