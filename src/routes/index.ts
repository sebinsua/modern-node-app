import { z } from 'zod';

import { createTypedRoutesPlugin } from 'core';

import { getPgTables, PgTable } from './getRoot';

export const routes = createTypedRoutesPlugin((app, _, done) => {
  app.route({
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
          rows: z.array(PgTable),
        }),
      },
    },
    async handler(request, reply) {
      request.log.info('foo');

      const rows = await getPgTables();

      return reply.send({
        message: `Hello ${request.query.name}`,
        rows: [...rows],
      });
    },
  });

  done();
});
