import { sql } from 'slonik';

import { pool } from 'modules/database';

export async function checkDatabaseConnection() {
  return pool.exists(sql.typeAlias('one')`SELECT 1 as "one"`);
}
