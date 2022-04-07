import { serializeError } from 'serialize-error';

import { createServer, serverLog } from './core';
import { createRoutes } from './createRoutes';

process.on('uncaughtException', (error, origin) => {
  serverLog.fatal(
    { error: serializeError(error) },
    `Unccaught exception at ${origin}`
  );
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  serverLog.fatal({ error: serializeError(reason) }, `Unccaught rejection`);
  process.exit(1);
});

const mainRoutes = createRoutes();
const app = createServer(mainRoutes);

app.listen({ port: 3000, host: '0.0.0.0' }, (error) => {
  if (error) {
    serverLog.fatal({ error: serializeError(error) }, 'Error starting server!');
    process.exit(1);
  }
});
