// Inlined from https://github.com/autotelic/fastify-slonik
import fp from 'fastify-plugin';
import { createPool } from 'slonik';
import { requestContext } from '@fastify/request-context';

import type { DatabasePool, ClientConfiguration } from 'slonik';

declare module 'fastify' {
  export interface FastifyInstance {
    slonikConnectionPool: DatabasePool;
  }
}
declare module '@fastify/request-context' {
  interface RequestContextData {
    slonikConnectionPool: DatabasePool;
  }
}

export interface FastifySlonikOptions {
  connectionString: string;
  poolOptions?: Partial<ClientConfiguration>;
}

export const fastifySlonik = fp(async (app, options: any) => {
  const { connectionString, poolOptions = {} } = options;
  const connectionPool = await createPool(connectionString, poolOptions);

  app.decorate('slonikConnectionPool', connectionPool);
  app.addHook('onRequest', (request, _, done) => {
    request.requestContext.set('slonikConnectionPool', connectionPool);
    done();
  });

  app.addHook('onClose', async () => {
    await connectionPool.end();
  });

  // Test that the database connection is viable.
  try {
    await connectionPool.connect(async (_) => {
      app.log.info(`Connected to Postgres database at ${connectionString}`);
    });
  } catch (err) {
    app.log.fatal(err);
    await app.close();
    process.exit(1);
  }
});

export function getConnectionPool() {
  const connectionPool = requestContext.get('slonikConnectionPool');
  if (!connectionPool) {
    throw new Error('No connection pool available');
  }

  return connectionPool;
}
