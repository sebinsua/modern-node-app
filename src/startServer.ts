import * as fs from 'fs';
import * as path from 'path';

import { serializeError } from 'serialize-error';

import { createServer, serverLog } from './core';
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

(async () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );
  const mainRoutes = createRoutes({
    title: packageJson.name,
    description: `The \`${packageJson.name}\` API`,
  });
  const app = await createServer(mainRoutes, {
    slonik: {
      connectionString: 'postgres://localhost:5432/postgres',
    },
  });

  app.listen({ port: 3000, host: '0.0.0.0' }, (error) => {
    if (error) {
      serverLog.fatal(
        { error: serializeError(error) },
        'Error starting server!'
      );
      process.exit(1);
    }
  });
})();
