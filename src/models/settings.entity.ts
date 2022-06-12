import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export type SettingsItems = Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>;

export function defaultSettings(): SettingsItems {
  return {
    dataCollectionEnabled: true,
    devModeEnabled: false
  };
}

@Entity()
export class Settings {

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  dataCollectionEnabled!: boolean;

  @Column()
  devModeEnabled!: boolean;

  @Column()
  createdAt!: Date;

  @Column()
  updatedAt!: Date;

}
