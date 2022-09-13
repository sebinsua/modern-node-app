import { sql } from 'slonik';

import { pool } from 'modules/database';

export async function checkDatabaseConnection() {
  return pool.exists(sql`SELECT 1 as "one"`);
}
