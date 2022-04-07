import { z } from 'zod';

import type {
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyPluginOptions,
  FastifyTypeProviderDefault,
} from 'fastify';

import { sql } from 'slonik';
import { withConnection } from './withConnection';

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
        }),
      },
    },
    async handler(request, reply) {
      request.log.info('foo');

      // TODO: We should be able to replace this with a `Proxy` to these methods.
      //
      // e.g.
      //
      // const foo = await connection.query(sql`SELECT * FROM foo`);
      //
      const foo = await withConnection((connection) => {
        return connection.query(sql`SELECT * FROM foo`);
      });

      reply.send({
        message: `Hello ${request.query.name}`,
      });
    },
  });

  done();
};

export default routes;
