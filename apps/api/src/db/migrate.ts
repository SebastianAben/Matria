import { loadConfig } from '../config.js';
import { createDatabase } from './client.js';
import { runMigrations } from './migrations.js';

const config = loadConfig();
const database = createDatabase(config);

if (!database) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const result = await runMigrations(database);
await database.end();

console.log(`Applied migrations: ${result.applied.length ? result.applied.join(', ') : 'none'}`);
