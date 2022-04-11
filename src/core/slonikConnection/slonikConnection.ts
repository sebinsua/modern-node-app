import { getConnectionPool } from './slonikFastifyPlugin';

import type { DatabasePool } from 'slonik';

export const slonikPool = new Proxy({} as DatabasePool, {
  get(_, prop) {
    const pool = getConnectionPool();
    if (prop in pool === false) {
      throw new Error(`Unexpected property: ${prop.toString()}`);
    }

    // @ts-ignore
    return pool[prop];
  },
});
