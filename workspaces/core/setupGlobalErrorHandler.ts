import { serializeError } from 'serialize-error';

import { serverLog } from './roarrLogger';

export function setupGlobalErrorHandler() {
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
}
