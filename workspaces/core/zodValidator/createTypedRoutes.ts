import type {
  FastifyInstance,
  FastifyBaseLogger,
  FastifyPluginOptions,
  FastifyTypeProviderDefault,
} from 'fastify';
import {
  zodErrorHandler,
  zodSchemaErrorFormatter,
  zodSerializerCompiler,
  zodValidatorCompiler,
} from './zodFastifyPlugin';

import type { Server, IncomingMessage, ServerResponse } from 'http';
import type { FastifyTypeProvider } from 'fastify';
import type { z, ZodTypeAny } from 'zod';
import { serializeError } from 'serialize-error';

export interface ZodTypeProvider extends FastifyTypeProvider {
  output: this['input'] extends ZodTypeAny ? z.infer<this['input']> : never;
}

export type RoutesPluginFn = (
  app: FastifyInstance<
    Server,
    IncomingMessage,
    ServerResponse,
    FastifyBaseLogger,
    FastifyTypeProviderDefault
  >,
  options: FastifyPluginOptions,
  done: (err?: Error | undefined) => void
) => void;

export function createTypedRoutesPlugin(
  applyRoutes: (
    typedApp: FastifyInstance<
      Server,
      IncomingMessage,
      ServerResponse,
      FastifyBaseLogger,
      ZodTypeProvider
    >,
    options: FastifyPluginOptions,
    done: (err?: Error | undefined) => void
  ) => void
): RoutesPluginFn {
  return (app, options, done) => {
    app
      .setValidatorCompiler(zodValidatorCompiler)
      .setSerializerCompiler(zodSerializerCompiler)
      .setSchemaErrorFormatter(zodSchemaErrorFormatter)
      .setErrorHandler(function (error, request, reply) {
        this.log.error(serializeError(error), error.message);

        zodErrorHandler(error, request, reply);

        if (!reply.sent) {
          const statusCode = error.statusCode ?? 500;
          reply.status(statusCode).send({
            error: error.message,
          });
        }
      });

    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    applyRoutes(typedApp, options, done);
  };
}
