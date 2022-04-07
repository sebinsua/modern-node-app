import { serializeError } from "serialize-error";

import { createServer, serverLog } from "./createServer";
import routes from "./routes";

const app = createServer(routes);

app.listen({ port: 3000, host: "0.0.0.0" }, (error) => {
  if (error) {
    serverLog.fatal({ error: serializeError(error) }, "Error starting server!");
    process.exit(1);
  }
});
