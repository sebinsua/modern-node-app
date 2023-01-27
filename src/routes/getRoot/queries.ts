import { sql } from 'slonik';
import { z } from 'zod';

import { pool } from 'modules/database';

export const PgTable = z.object({
  schemaname: z.string().nullable(),
  tablename: z.string().nullable(),
  tableowner: z.string().nullable(),
  tablespace: z.string().nullable(),
  hasindexes: z.boolean(),
  hasrules: z.boolean(),
  hastriggers: z.boolean(),
  rowsecurity: z.boolean(),
});

export async function getPgTables() {
  return pool.many(sql.type(PgTable)`
    SELECT * FROM pg_catalog.pg_tables
  `);
}
