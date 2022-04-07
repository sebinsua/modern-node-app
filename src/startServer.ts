import * as fs from 'fs';
import * as path from 'path';

import { serializeError } from 'serialize-error';

import { serverLog } from './core/roarrLogger';
import { createServer } from './core';
import { createRoutes } from './createRoutes';

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

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

(async () => {
  const mainRoutes = createRoutes();

  const app = await createServer(mainRoutes, {
    name: packageJson.name,
    description: `The \`${packageJson.name}\` API`,
    prefix: '/api',
    slonik: {
      connectionString: 'postgres://localhost:5432/postgres',
    },
  });

  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
  } catch (error) {
    serverLog.fatal({ error: serializeError(error) }, 'Error starting server!');
    process.exit(1);
  }
})();
