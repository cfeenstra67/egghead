import type { Theme } from "../server/types.js";

export type SettingsItems = Omit<Settings, "id" | "createdAt" | "updatedAt">;

// @Entity()
export class Settings {
  // @PrimaryGeneratedColumn('uuid')
  id!: string;

  // @Column()
  dataCollectionEnabled!: boolean;

  // @Column()
  devModeEnabled!: boolean;

  // @Column()
  retentionPolicyMonths!: number;

  showFullUrls!: boolean;

  // @Column()
  theme: Theme;

  // @Column()
  createdAt!: Date;

  // @Column()
  updatedAt!: Date;
}
