import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Theme } from '../server/types';

export type SettingsItems = Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>;

@Entity()
export class Settings {

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  dataCollectionEnabled!: boolean;

  @Column()
  devModeEnabled!: boolean;

  @Column()
  theme: Theme;

  @Column()
  createdAt!: Date;

  @Column()
  updatedAt!: Date;

}
