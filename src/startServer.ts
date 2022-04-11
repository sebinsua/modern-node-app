import { z } from 'zod';
import { serializeError } from 'serialize-error';
import { createQueryLoggingInterceptor } from 'slonik-interceptor-query-logging';

import { serverLog } from 'modules/logger';

import { getApplicationName, createServer, getConfig } from './core';
import routes from './routes';

import type { Interceptor } from 'slonik';

process.on('uncaughtException', (error, origin) => {
  serverLog.fatal(
    { error: serializeError(error) },
    `Uncaught exception at ${origin}`
  );
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  serverLog.fatal({ error: serializeError(reason) }, `Uncaught rejection`);
  process.exit(1);
});

(async () => {
  try {
    const applicationName = await getApplicationName();

    const config = getConfig(
      z.object({
        APP_HOST: z.string(),
        APP_PORT: z.string().regex(/^\d+$/),
        APP_BASE_URL: z.string(),
        APP_POSTGRES_CONNECTION_STRING: z.string().url(),
        APP_POSTGRES_QUERY_LOGGING: z
          .union([z.literal('true'), z.literal('false')])
          .default('false'),
      })
    );

    const app = await createServer(routes, {
      name: applicationName,
      description: `The \`${applicationName}\` API`,
      prefix: config.APP_BASE_URL,
      slonik: {
        connectionString: config.APP_POSTGRES_CONNECTION_STRING,
        poolOptions: {
          interceptors: [
            config.APP_POSTGRES_QUERY_LOGGING === 'true'
              ? createQueryLoggingInterceptor()
              : undefined,
          ].filter(
            (interceptor): interceptor is Interceptor =>
              interceptor !== undefined
          ),
        },
      },
    });

    await app.listen({
      host: config.APP_HOST,
      port: Number(config.APP_PORT),
    });
  } catch (error) {
    serverLog.fatal({ error: serializeError(error) }, 'Error starting server!');
    process.exit(1);
  }
})();
