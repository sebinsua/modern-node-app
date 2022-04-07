import { z } from 'zod';
import { sql } from 'slonik';

import { createTypedRoutes } from './core';
import { connection } from './database';

export default createTypedRoutes((typedApp) => {
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

      const results = await connection.query(sql`SELECT * FROM foo`);

      return reply.send({
        message: `Hello ${request.query.name}`,
        rows: [...results.rows],
      });
    },
  });
});
