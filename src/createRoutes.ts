import { z } from 'zod';
import { sql } from 'slonik';

import { createTypedRoutes } from './core';
import { connection } from './database';

export function createRoutes() {
  return createTypedRoutes((app) => {
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
            rows: z.array(z.any()),
          }),
        },
      },
      async handler(request, reply) {
        request.log.info('foo');

        const rows = await connection.many(
          sql`SELECT * FROM pg_catalog.pg_tables;`
        );

        return reply.send({
          message: `Hello ${request.query.name}`,
          rows: [...rows],
        });
      },
    });
  });
}
