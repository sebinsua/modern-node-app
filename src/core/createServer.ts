import { fastify as createFastify } from 'fastify';
import fastifyCors from 'fastify-cors';
import { fastifyRequestContextPlugin } from 'fastify-request-context';
import customHealthCheck from 'fastify-custom-healthcheck';
import { createFastifyLogger } from '@roarr/fastify';
import { randomUUID } from 'crypto';

import { serverLog } from './roarrLogger';
import { checkDatabaseConnection, fastifySlonik } from './slonikConnection';
import { fastifyZod, RoutesPluginFn } from './zodValidator';

import type { ClientConfiguration } from 'slonik';

import type { FastifyCorsOptions } from 'fastify-cors';

export interface CreateServerOptions {
  name: string;
  description: string;
  prefix?: string | undefined;
  slonik: {
    connectionString: string;
    poolOptions?: Partial<ClientConfiguration>;
  };
  cors?: FastifyCorsOptions;
}

export async function createServer(
  routesPlugin: RoutesPluginFn,
  options: CreateServerOptions
) {
  const requestIdLogLabel = 'requestId';

  const app = createFastify({
    logger: createFastifyLogger(serverLog, { requestIdLogLabel }),
    requestIdLogLabel,
    ignoreTrailingSlash: true,
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

  await app.register(fastifyCors, options.cors);

  await app.register(fastifySlonik, options.slonik);

  await app.register(
    async (instance) => {
      await instance.register(customHealthCheck);
      instance.addHealthCheck('postgresql', checkDatabaseConnection);

      instance.get('/kill', async (_, reply) => {
        reply.send({
          message: 'Server killed!',
        });

        await app.close();

        process.exit(0);
      });

      await instance.register(fastifyZod, options);

      await instance.register(routesPlugin);
    },
    options.prefix ? { prefix: options.prefix } : {}
  );

  return app;
}
