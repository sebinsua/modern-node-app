import { z } from 'zod';

import { createTypedRoutesPlugin } from '../core';
import { getPgTables } from './getRoot';

export default createTypedRoutesPlugin((app, _, done) => {
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
          rows: z.array(
            z.object({
              schemaname: z.string().nullable(),
              tablename: z.string().nullable(),
              tableowner: z.string().nullable(),
              tablespace: z.string().nullable(),
              hasindexes: z.boolean().nullable(),
              hasrules: z.boolean().nullable(),
              hastriggers: z.boolean().nullable(),
              rowsecurity: z.boolean().nullable(),
            })
          ),
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
