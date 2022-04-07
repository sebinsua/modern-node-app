import { fastify as createFastify } from 'fastify';
import { fastifyRequestContextPlugin } from 'fastify-request-context';

import swagger from 'fastify-swagger';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Roarr, getLogLevelName } from 'roarr';
import { createFastifyLogger } from '@roarr/fastify';
import { randomUUID } from 'crypto';

import { serializeMessage } from './roarrSerializeMessage';
import {
  serializerCompiler,
  validatorCompiler,
} from './zodFastifyTypeProvider';
import { fastifySlonik } from './slonikFastifyPlugin';

import type { RoutesFn } from './createTypedRoutes';

// @ts-ignore
const ROARR = (globalThis.ROARR = globalThis.ROARR || {});

ROARR.serializeMessage = serializeMessage;

export const serverLog = Roarr.child((message) => ({
  level: getLogLevelName(Number(message.context['logLevel'])).toUpperCase(),
  timestamp: new Date(message.time).toISOString(),
  ...message,
  context: {
    ...message.context,
    application: 'server',
  },
}));

export function createServer(routes: RoutesFn) {
  const requestIdLogLabel = 'requestId';

  const app = createFastify({
    logger: createFastifyLogger(serverLog, { requestIdLogLabel }),
    requestIdLogLabel,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // @ts-ignore
  app.register(swagger, {
    exposeRoute: true,
    openapi: {
      info: {
        title: 'API',
        description: 'API Docs',
      },
    },
    transform({ schema, url }) {
      const transformedUrl = url;
      const {
        params,
        body,
        querystring,
        headers,
        response,
        ...transformedSchema
      } = schema;

      if (params) {
        // @ts-ignore
        transformedSchema.params = zodToJsonSchema(params as any);
      }
      if (body) {
        // @ts-ignore
        transformedSchema.body = zodToJsonSchema(body as any);
      }
      if (querystring) {
        // @ts-ignore
        transformedSchema.querystring = zodToJsonSchema(querystring as any);
      }
      if (headers) {
        // @ts-ignore
        transformedSchema.headers = zodToJsonSchema(headers as any);
      }
      if (response) {
        // @ts-ignore
        transformedSchema.response = Object.fromEntries(
          Object.entries(response as any).map(
            ([statusCode, statusResponse]) => [
              statusCode,
              zodToJsonSchema(statusResponse as any),
            ]
          )
        );
      }

      return {
        url: transformedUrl,
        schema: transformedSchema,
      };
    },
  });

  app.register(fastifyRequestContextPlugin);
  app.addHook('onRequest', (request, _, done) => {
    request.requestContext.set(
      'correlationId',
      request.headers['correlation-id'] ?? randomUUID()
    );
    done();
  });
  app.addHook('preHandler', (request, _, done) => {
    const correlationId = request.requestContext.get('correlationId');
    void serverLog.adopt(() => done(), { correlationId });
  });

  app.register(fastifySlonik, {
    connectionString: '',
    poolOptions: {},
  });

  app.register(routes);

  return app;
}
