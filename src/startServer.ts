import { serializeError } from 'serialize-error';

import { createServer, serverLog } from './core';
import { createRoutes } from './createRoutes';

const mainRoutes = createRoutes();
const app = createServer(mainRoutes);

app.listen({ port: 3000, host: '0.0.0.0' }, (error) => {
  if (error) {
    serverLog.fatal({ error: serializeError(error) }, 'Error starting server!');
    process.exit(1);
  }
});
