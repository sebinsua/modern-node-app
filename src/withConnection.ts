import { getConnectionPool } from './slonikFastifyPlugin';
import type { DatabasePool } from 'slonik';

export const withConnection: DatabasePool['connect'] = function withConnection(
  connectionRoutine
) {
  const connectionPool = getConnectionPool();

  return connectionPool.connect(connectionRoutine);
};
