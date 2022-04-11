import { sql } from 'slonik';

import { connection } from 'modules/database';

export async function getPgTables() {
  return connection.many(
    sql<queries.PgTable>`SELECT * FROM pg_catalog.pg_tables`
  );
}

export declare namespace queries {
  // Generated by @slonik/typegen

  /** - query: `SELECT * FROM pg_catalog.pg_tables` */
  export interface PgTable {
    /** column: `pg_catalog.pg_tables.schemaname`, regtype: `name` */
    schemaname: string | null;

    /** column: `pg_catalog.pg_tables.tablename`, regtype: `name` */
    tablename: string | null;

    /** column: `pg_catalog.pg_tables.tableowner`, regtype: `name` */
    tableowner: string | null;

    /** column: `pg_catalog.pg_tables.tablespace`, regtype: `name` */
    tablespace: string | null;

    /** column: `pg_catalog.pg_tables.hasindexes`, regtype: `boolean` */
    hasindexes: boolean | null;

    /** column: `pg_catalog.pg_tables.hasrules`, regtype: `boolean` */
    hasrules: boolean | null;

    /** column: `pg_catalog.pg_tables.hastriggers`, regtype: `boolean` */
    hastriggers: boolean | null;

    /** column: `pg_catalog.pg_tables.rowsecurity`, regtype: `boolean` */
    rowsecurity: boolean | null;
  }
}
