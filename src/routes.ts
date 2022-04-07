import { z } from 'zod';

import type {
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyPluginOptions,
  FastifyTypeProviderDefault,
} from 'fastify';

import { sql } from 'slonik';
import { slonikConnection } from './slonikConnection';

import type { Server, IncomingMessage, ServerResponse } from 'http';
import type { ZodTypeProvider } from './zodFastifyTypeProvider';

export type RoutesFn = (
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

const routes: RoutesFn = (app, _, done) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.route({
    method: 'GET',
    url: '/',
    schema: {
      operationId: 'getRoot',
      summary: 'Get root',
      description: 'Longer description goes here.',
      tags: ['root'],
      querystring: z.object({
        name: z.string(),
      }),
      response: {
        200: z.object({
          message: z.string(),
          rows: z.array(z.any()),
        }),
      },
    },
    async handler(request, reply) {
      request.log.info('foo');

      const results = await slonikConnection.query(sql`SELECT * FROM foo`);

      return reply.send({
        message: `Hello ${request.query.name}`,
        rows: [...results.rows],
      });
    },
  });

  done();
};

export default routes;
