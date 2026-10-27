import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

let server;

async function startServer() {
  await connectDatabase();
  server = app.listen(env.PORT, () => {
    console.log(`MediSync API listening on port ${env.PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down MediSync API...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch((error) => {
  console.error('Failed to start MediSync API:', error);
  process.exit(1);
});
