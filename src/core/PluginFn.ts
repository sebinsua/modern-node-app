import type {
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyTypeProviderDefault,
  FastifyPluginOptions,
} from 'fastify';
import type { Server, IncomingMessage, ServerResponse } from 'http';

export type PluginFn = (
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
