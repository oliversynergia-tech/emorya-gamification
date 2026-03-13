import { resolve } from "path";
import { fileURLToPath } from "url";

import { runDbCommand } from "./db-tools.mjs";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const command = process.argv[2];
const args = process.argv.slice(3);

try {
  await runDbCommand({ rootDir, command, args });
} catch (error) {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
}
