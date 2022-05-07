import { PrimaryColumn, Entity, Column, ManyToOne } from 'typeorm';

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

  @Column({ nullable: true })
  transitionType!: string;

  @Column()
  startedAt!: Date;

  @Column({ nullable: true })
  endedAt?: Date;

}
