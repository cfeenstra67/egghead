// Source: https://gist.github.com/lovasoa/8691344
import * as fs from "node:fs";
import * as path from "node:path";

export async function* walkDirectory(dir: string): AsyncGenerator<string> {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walkDirectory(entry);
    else if (d.isFile()) yield entry;
  }
}
