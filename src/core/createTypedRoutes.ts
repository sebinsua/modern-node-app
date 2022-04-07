import type {
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyPluginOptions,
  FastifyTypeProviderDefault,
} from 'fastify';

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

export function createTypedRoutes(
  applyRoutes: (
    typedApp: FastifyInstance<
      Server,
      IncomingMessage,
      ServerResponse,
      FastifyLoggerInstance,
      ZodTypeProvider
    >
  ) => void
): RoutesFn {
  return (app, _, done) => {
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    applyRoutes(typedApp);

    done();
  };
}
