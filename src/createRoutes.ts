import { z } from 'zod';
import { sql } from 'slonik';

import { createTypedRoutes } from './core';
import { connection } from './database';

export interface CreateRoutesOptions {
  title: string;
  description: string;
}

export function createRoutes(options: CreateRoutesOptions) {
  return createTypedRoutes((app) => {
    app.route({
      method: 'GET',
      url: '/word',
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

        const results = await connection.query(sql`SELECT * FROM users`);

        return reply.send({
          message: `Hello ${request.query.name}`,
          rows: [...results.rows],
        });
      },
    });
  }, options);
}
