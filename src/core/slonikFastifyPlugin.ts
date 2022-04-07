// Inlined from https://github.com/autotelic/fastify-slonik
import { createPool } from 'slonik';

import type {
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyTypeProviderDefault,
  FastifyPluginOptions,
} from 'fastify';
import { requestContext } from 'fastify-request-context';
import type { Server, IncomingMessage, ServerResponse } from 'http';
import type { DatabasePool } from 'slonik';

export type PluginFn = (
  app: FastifyInstance<
    Server,
    IncomingMessage,
    ServerResponse,
    FastifyLoggerInstance,
    FastifyTypeProviderDefault
  >,
  options: FastifyPluginOptions,
  done: (err?: Error | undefined) => void
) => void;

declare module 'fastify' {
  export interface FastifyInstance {
    slonikConnectionPool: DatabasePool;
  }
}
declare module 'fastify-request-context' {
  interface RequestContextData {
    slonikConnectionPool: DatabasePool;
  }
}

export const fastifySlonik: PluginFn = async (app, options) => {
  const { connectionString, poolOptions = {} } = options;
  const connectionPool = createPool(connectionString, poolOptions);

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
};

export function getConnectionPool() {
  const connectionPool = requestContext.get('slonikConnectionPool');
  if (!connectionPool) {
    throw new Error('No connection pool available');
  }

  return connectionPool;
}
