import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createApp } from './app';
import { createDatabase, migrate } from './db';

const PORT = Number(process.env.PORT ?? 3000);

/**
 * Where the built SPA lives. Serving it from the same process is what makes the
 * self-host story a single container and a single origin — which in turn means
 * the session cookie needs no cross-site configuration at all.
 */
const STATIC_ROOT = process.env.STATIC_ROOT ?? './dist';

async function main() {
  const { db, client } = createDatabase();
  await migrate(client);

  const app = createApp({
    db,
    // Only mark cookies Secure when actually served over HTTPS, or local
    // development over http:// silently loses its session.
    secureCookies: process.env.NODE_ENV === 'production',
  });

  if (existsSync(STATIC_ROOT)) {
    app.use('/*', serveStatic({ root: STATIC_ROOT }));

    // Client-side routing: anything that is not an API call and not a real file
    // is a route the browser should resolve, so hand back the shell.
    const shell = await readFile(`${STATIC_ROOT}/index.html`, 'utf-8').catch(() => null);
    if (shell) {
      app.notFound((c) =>
        c.req.path.startsWith('/api/') ? c.json({ error: 'Not found.' }, 404) : c.html(shell)
      );
    }
  } else {
    console.warn(`No built frontend at ${STATIC_ROOT}; serving the API only.`);
  }

  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`Brassworth listening on http://localhost:${info.port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start:', error);
  process.exit(1);
});
