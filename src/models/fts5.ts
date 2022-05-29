import type { QueryRunner } from "typeorm";

const dummyColumnName = "dum";

export type ColumnInput = string | [string, boolean];

export interface Fts5TableArgs {
  schemaName?: string;
  tableName: string;
  columns: ColumnInput[];
  contentTableName: string;
  contentSchemaName?: string;
  contentRowId?: string;
  tokenize?: string;
}

export function getColumn(input: ColumnInput): [string, boolean] {
  if (Array.isArray(input)) {
    return input;
  }
  return [input, true];
}

function quoteDdlName(name: string): string {
  return JSON.stringify(name);
}

function getFullTableName(tableName: string, schemaName?: string): string {
  let out: string = quoteDdlName(tableName);
  if (schemaName !== undefined) {
    out = `${quoteDdlName(schemaName)}.${out}`;
  }
  return out;
}

export function fts5createTableSql(args: Fts5TableArgs): string {
  const tableName = getFullTableName(args.tableName, args.schemaName);

  const columnStrings = args.columns
    .map((colInput) => {
      const [colName, indexed] = getColumn(colInput);
      return `${quoteDdlName(colName)}${indexed ? "" : " UNINDEXED"}`;
    })
    .concat([quoteDdlName(dummyColumnName)]);

  const components = [
    "CREATE VIRTUAL TABLE",
    tableName,
    "USING fts5(",
    columnStrings.join(", "),
    `, content=${getFullTableName(
      args.contentTableName,
      args.contentSchemaName
    )}`,
  ];

  if (args.contentRowId !== undefined) {
    components.push(`, content_rowid=${quoteDdlName(args.contentRowId)}`);
  }
  if (args.tokenize !== undefined) {
    components.push(`, tokenize='${args.tokenize}'`);
  }

  components.push(");");
  return components.join(" ");
}

export function fts5InsertIntoIndexSql(args: Fts5TableArgs): string {
  const tableName = getFullTableName(args.tableName, args.schemaName);

  const insertCols = ["rowid", ...args.columns]
    .map((input) => quoteDdlName(getColumn(input)[0]))
    .concat([quoteDdlName(dummyColumnName)]);

  const selectCols = [args.contentRowId || "rowid", ...args.columns]
    .map((input) => quoteDdlName(getColumn(input)[0]))
    .concat([`'${dummyColumnName}'`]);

  const components = [
    "INSERT INTO",
    tableName,
    "(",
    insertCols.join(", "),
    ") SELECT",
    selectCols.join(", "),
    "FROM",
    getFullTableName(args.contentTableName, args.contentSchemaName),
    ";",
  ];

  return components.join(" ");
}

function insertTriggerName(args: Fts5TableArgs): string {
  return [args.schemaName, args.tableName, "ai"]
    .filter((comp) => comp !== undefined)
    .join("_");
}

export function fts5InsertTriggerSql(args: Fts5TableArgs): string {
  const triggerName = insertTriggerName(args);

  const insertCols = ["rowid", ...args.columns]
    .map((input) => quoteDdlName(getColumn(input)[0]))
    .concat([quoteDdlName(dummyColumnName)]);

  const selectCols = [args.contentRowId || "rowid", ...args.columns]
    .map((input) => "new." + quoteDdlName(getColumn(input)[0]))
    .concat([`'${dummyColumnName}'`]);

  const components = [
    "CREATE TRIGGER",
    quoteDdlName(triggerName),
    "AFTER INSERT ON",
    getFullTableName(args.contentTableName, args.contentSchemaName),
    "BEGIN INSERT INTO",
    getFullTableName(args.tableName, args.schemaName),
    "(",
    insertCols.join(", "),
    ") VALUES (",
    selectCols.join(", "),
    "); END;",
  ];

  return components.join(" ");
}

function updateTriggerName(args: Fts5TableArgs): string {
  return [args.schemaName, args.tableName, "au"]
    .filter((comp) => comp !== undefined)
    .join("_");
}

export function fts5UpdateTriggerSql(args: Fts5TableArgs): string {
  const triggerName = updateTriggerName(args);

  const insertCols = ["rowid", ...args.columns]
    .map((input) => quoteDdlName(getColumn(input)[0]))
    .concat([quoteDdlName(dummyColumnName)]);

  const oldSelectCols = [args.contentRowId || "rowid", ...args.columns]
    .map((input) => "old." + quoteDdlName(getColumn(input)[0]))
    .concat([`'${dummyColumnName}'`]);

  const newSelectCols = [args.contentRowId || "rowid", ...args.columns]
    .map((input) => "new." + quoteDdlName(getColumn(input)[0]))
    .concat([`'${dummyColumnName}'`]);

  const fullTableName = getFullTableName(args.tableName, args.schemaName);

  const components = [
    "CREATE TRIGGER",
    quoteDdlName(triggerName),
    "AFTER UPDATE ON",
    getFullTableName(args.contentTableName, args.contentSchemaName),
    "BEGIN INSERT INTO",
    fullTableName,
    `( ${fullTableName}, `,
    insertCols.join(", "),
    ") VALUES ('delete', ",
    oldSelectCols.join(", "),
    ");",
    "INSERT INTO",
    getFullTableName(args.tableName, args.schemaName),
    "(",
    insertCols.join(", "),
    ") VALUES (",
    newSelectCols.join(", "),
    "); END;",
  ];

  return components.join(" ");
}

function deleteTriggerName(args: Fts5TableArgs): string {
  return [args.schemaName, args.tableName, "ad"]
    .filter((comp) => comp !== undefined)
    .join("_");
}

export function fts5DeleteTriggerSql(args: Fts5TableArgs): string {
  const triggerName = deleteTriggerName(args);

  const insertCols = ["rowid", ...args.columns]
    .map((input) => quoteDdlName(getColumn(input)[0]))
    .concat([quoteDdlName(dummyColumnName)]);

  const newSelectCols = [args.contentRowId || "rowid", ...args.columns]
    .map((input) => "new." + quoteDdlName(getColumn(input)[0]))
    .concat([`'${dummyColumnName}'`]);

  const fullTableName = getFullTableName(args.tableName, args.schemaName);

  const components = [
    "CREATE TRIGGER",
    quoteDdlName(triggerName),
    "AFTER DELETE ON",
    getFullTableName(args.contentTableName, args.contentSchemaName),
    "BEGIN INSERT INTO",
    fullTableName,
    `( ${fullTableName}, `,
    insertCols.join(", "),
    ") VALUES ('delete', ",
    newSelectCols.join(", "),
    "); END;",
  ];

  return components.join(" ");
}

export function fts5VocabTableName(args: Fts5TableArgs): string {
  const out: string = quoteDdlName(`${args.tableName}_vocab`);
  if (args.schemaName !== undefined) {
    return `${quoteDdlName(args.schemaName)}.${out}`;
  }
  return out;
}

export function fts5CreateVocabTableSql(args: Fts5TableArgs): string {
  const tableArgs = [args.tableName, "instance"].join(", ");

  const components = [
    "CREATE VIRTUAL TABLE",
    fts5VocabTableName(args),
    "USING fts5vocab(",
    tableArgs,
    ");",
  ];

  return components.join(" ");
}

export async function createFts5Index(
  args: Fts5TableArgs,
  runner: QueryRunner
): Promise<void> {
  await runner.query(fts5createTableSql(args));
  await runner.query(fts5CreateVocabTableSql(args));
  await runner.query(fts5InsertIntoIndexSql(args));
  await runner.query(fts5InsertTriggerSql(args));
  await runner.query(fts5UpdateTriggerSql(args));
  await runner.query(fts5DeleteTriggerSql(args));
}

export async function dropFts5Index(
  args: Fts5TableArgs,
  runner: QueryRunner
): Promise<void> {
  await runner.query(
    `DROP TRIGGER IF EXISTS ${quoteDdlName(insertTriggerName(args))}`
  );
  await runner.query(
    `DROP TRIGGER IF EXISTS ${quoteDdlName(updateTriggerName(args))}`
  );
  await runner.query(
    `DROP TRIGGER IF EXISTS ${quoteDdlName(deleteTriggerName(args))}`
  );
  await runner.query(`DROP TABLE IF EXISTS ${fts5VocabTableName(args)}`);
  await runner.query(
    `DROP TABLE IF EXISTS ${getFullTableName(args.tableName, args.schemaName)}`
  );
}
