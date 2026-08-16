// One-shot manual backup: npm run backup
// Writes a timestamped copy of the database to ./backups and prunes old ones.
import { runBackup, pruneBackups } from "../core/lib/backup";

async function main() {
  const file = await runBackup();
  if (!file) process.exit(1);
  pruneBackups();
}

void main();