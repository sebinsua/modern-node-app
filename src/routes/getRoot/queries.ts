import { sql } from 'slonik';

import { connection } from 'modules/database';

export async function getPgTables() {
  return connection.many(sql`SELECT * FROM pg_catalog.pg_tables;`);
}
