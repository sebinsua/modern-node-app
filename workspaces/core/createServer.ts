import { fastify as createFastify } from 'fastify';
import gracefulShutdown from 'http-graceful-shutdown';
import fastifyCors from '@fastify/cors';
import { fastifyRequestContext } from '@fastify/request-context';
import customHealthCheck from 'fastify-custom-healthcheck';
import { createFastifyLogger } from '@roarr/fastify';
import { randomUUID } from 'crypto';
import { serializeError } from 'serialize-error';

import { serverLog } from './roarrLogger';
import { checkDatabaseConnection, fastifySlonik } from './slonikConnection';
import { fastifyZod, RoutesPluginFn } from './zodValidator';

import type { ClientConfiguration } from 'slonik';

import type { FastifyCorsOptions } from '@fastify/cors';

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
  const requestIdHeader = 'request-id';
  const genReqId = () => randomUUID();

  const app = createFastify({
    genReqId,
    requestIdHeader,
    requestIdLogLabel,
    logger: createFastifyLogger(serverLog, { requestIdLogLabel }),
    ignoreTrailingSlash: true,
  });

  const shutdown = gracefulShutdown(app.server, {
    finally() {
      serverLog.info('Graceful shutdown of the server completed');
    },
  });

  await app.register(fastifyRequestContext);
  app
    .addHook('onRequest', (request, _, done) => {
      const requestId = request.id;
      const correlationId = request.headers['correlation-id'] ?? randomUUID();
      request.requestContext.set('requestId', requestId);
      request.requestContext.set('correlationId', correlationId);
      done();
    })
    .addHook('preHandler', (request, _, done) => {
      const requestId = request.requestContext.get('requestId');
      const correlationId = request.requestContext.get('correlationId');
      void serverLog.adopt(() => done(), { requestId, correlationId });
    });

  await app.register(fastifyCors, options.cors);

  await app.register(fastifySlonik, options.slonik);

  await app.register(
    async (instance) => {
      await instance.register(customHealthCheck, {
        exposeFailure: process.env['NODE_ENV'] === 'development' ?? false,
      });
      instance.addHealthCheck('postgresql', checkDatabaseConnection);

      instance.get('/kill', async (request, reply) => {
        reply.send({
          message: 'Server killed!',
        });

        const FORCE_KILL_WAIT = 5_000;

        let isError = false;
        try {
          await shutdown();
        } catch (error) {
          isError = true;
          request.log.error(
            { error: serializeError(error) },
            'Error while gracefully shutting down the server!'
          );
        } finally {
          setTimeout(() => process.exit(isError ? 1 : 0), FORCE_KILL_WAIT);
        }
      });

      await instance.register(fastifyZod, options);

      await instance.register(routesPlugin);
    },
    options.prefix ? { prefix: options.prefix } : {}
  );

  return app;
}
