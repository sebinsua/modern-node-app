import { serializeError } from 'serialize-error';
import { createQueryLoggingInterceptor } from 'slonik-interceptor-query-logging';

import {
  setupGlobalErrorHandler,
  getApplicationName,
  getConfig,
  createServer,
} from 'core';
import { serverLog } from 'modules/logger';

import { AppConfig } from './AppConfig';
import { routes } from './routes';

import type { Interceptor } from 'slonik';

setupGlobalErrorHandler();

(async () => {
  try {
    const applicationName = await getApplicationName();
    const config = getConfig(AppConfig);

    const app = await createServer(routes, {
      name: applicationName,
      description: `The \`${applicationName}\` API`,
      prefix: config.APP_BASE_URL,
      slonik: {
        connectionString: config.APP_POSTGRES_CONNECTION_STRING,
        poolOptions: {
          interceptors: [
            config.APP_POSTGRES_QUERY_LOGGING === true
              ? createQueryLoggingInterceptor()
              : undefined,
          ].filter(
            (interceptor): interceptor is Interceptor =>
              interceptor !== undefined
          ),
        },
      },
      cors: {
        credentials: config.APP_CORS_CREDENTIALS === true,
        origin:
          typeof config.APP_CORS_ORIGIN === 'string'
            ? config.APP_CORS_ORIGIN.split(',')
            : [],
      },
    });

    await app.listen({
      host: config.APP_HOST,
      port: config.APP_PORT,
    });
  } catch (error) {
    serverLog.fatal({ error: serializeError(error) }, 'Error starting server!');
    process.exit(1);
  }
})();
