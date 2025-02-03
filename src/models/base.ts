export interface Column {
  type: "varchar" | "integer" | "datetime";
  nullable?: boolean;
}

export interface Table {
  name: string;
  columns: Record<string, Column>;
}
