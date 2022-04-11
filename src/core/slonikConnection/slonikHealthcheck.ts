import { sql } from 'slonik';

import { connection } from 'modules/database';

export async function checkDatabaseConnection() {
  return connection.exists(sql`SELECT 1 as "one"`);
}
