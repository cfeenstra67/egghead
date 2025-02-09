export interface Column {
  type: "varchar" | "integer" | "datetime";
  nullable?: boolean;
  indexed?: boolean;
}

export interface Table {
  name: string;
  columns: Record<string, Column>;
}
