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
      .setErrorHandler(zodErrorHandler);

    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    applyRoutes(typedApp, options, done);
  };
}
