import { serve } from '@hono/node-server';
import { createApp } from './app';
import { createDatabase, migrate } from './db';

const PORT = Number(process.env.PORT ?? 3000);

async function main() {
  const { db, client } = createDatabase();
  await migrate(client);

  const app = createApp({
    db,
    // Only mark cookies Secure when actually served over HTTPS, or local
    // development over http:// silently loses its session.
    secureCookies: process.env.NODE_ENV === 'production',
  });

  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`Brassworth API listening on http://localhost:${info.port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});
