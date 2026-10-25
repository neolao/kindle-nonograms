import { createApp } from "./app.js";
import { readConfig } from "./config.js";

try {
  const config = readConfig(process.env);
  const server = createApp(config).listen(config.port, config.host, () => {
    process.stdout.write(
      `Sync server listening on ${config.host}:${config.port}\n`,
    );
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    process.stderr.write(
      `Cannot listen on ${config.host}:${config.port}: ${error.code ?? error.message}\n`,
    );
    process.exit(1);
  });
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => server.close(() => process.exit(0)));
  }
} catch (error) {
  process.stderr.write(`${(error as Error).message}\n`);
  process.exit(1);
}
