import { fastify as createFastify } from 'fastify';
import { fastifyRequestContextPlugin } from 'fastify-request-context';

import customHealthCheck from 'fastify-custom-healthcheck';
import { createFastifyLogger } from '@roarr/fastify';
import { randomUUID } from 'crypto';

import { sql } from 'slonik';
import { serverLog } from './roarrLogger';
import { fastifySlonik, slonikConnection } from './slonikConnection';
import { connection } from '../database';

import type { ClientConfiguration } from 'slonik';
import type { RoutesFn } from './zodValidator';

export interface CreateServerOptions {
  slonik: {
    connectionString: string;
    poolOptions?: Partial<ClientConfiguration>;
  };
}

export async function createServer(
  routes: RoutesFn,
  options: CreateServerOptions
) {
  const requestIdLogLabel = 'requestId';

  const app = createFastify({
    logger: createFastifyLogger(serverLog, { requestIdLogLabel }),
    requestIdLogLabel,
  });

  await app.register(fastifyRequestContextPlugin);

  app
    .addHook('onRequest', (request, _, done) => {
      const correlationId = request.headers['correlation-id'] ?? randomUUID();
      request.requestContext.set('correlationId', correlationId);
      done();
    })
    .addHook('preHandler', (request, _, done) => {
      const correlationId = request.requestContext.get('correlationId');
      void serverLog.adopt(() => done(), { correlationId });
    });

  // app.register(
  //   (app, _, done) => {
  //     done();
  //   }
  //   //{ prefix: '/api' }
  // );

  await app.register(fastifySlonik, options.slonik);

  await app.register(customHealthCheck);
  app.addHealthCheck('slonik', async () => {
    console.log('slonik health check', slonikConnection);
    try {
      const blah = slonikConnection.exists(sql`SELECT 1 as "one"`);
    } catch (err) {
      console.log(err);
    }
    console.log('blah', blah);
    return blah;
  });

  app.get('/kill', async (_, reply) => {
    reply.send({
      message: 'Server killed!',
    });

    await app.close();

    process.exit(0);
  });

  await app.register(routes);

  return app;
}
