# Self-hosting

Brassworth self-hosts as one container: a Node process that serves the HTTP API
and the built app from the same origin on port 3000, with SQLite on a Docker
volume. There is no second service, no external database, and no reverse proxy
required to get started.

This page owns the environment variables. Backup and restore live in
[Backup and restore](./BACKUP.md).

---

## What you get, and what you do not

| You get                           | Detail                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A real security boundary          | Passwords hashed with scrypt, opaque session tokens stored only as SHA-256 hashes, roles checked server-side on every request. |
| One origin                        | The API and the app are served by the same process, so the session cookie needs no cross-site configuration.                   |
| A database that survives restarts | libSQL against a file on a named volume. Tables are created at startup.                                                        |
| Optional single sign-on           | OIDC with PKCE, off unless you configure it.                                                                                   |
| Optional vendor catalogue         | A server-held API key for a gear catalogue feed, off unless you configure it.                                                  |

| You do not get      | Why it matters                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTPS               | The container speaks plain HTTP on 3000. Terminate TLS in your own proxy. See [Putting it behind HTTPS](#putting-it-behind-https).                                              |
| A published image   | Nothing is pushed to a registry. You clone the repository and build locally.                                                                                                    |
| Closed registration | `POST /api/auth/signup` is open to anyone who can reach the app. Do not expose it to the internet unless you are comfortable with that, or put it behind your proxy's own auth. |
| Invitations         | There is no route to add a second person to a property yet. Treat server mode as single-user with a real boundary.                                                              |
| Password reset      | There is no reset route and no email. A forgotten password means editing the database.                                                                                          |
| File storage        | Photos and documents are embedded in records as `data:` URLs, not written to disk as files. A few photos make records large.                                                    |
| Automatic backups   | Nothing is backed up for you. See [Backup and restore](./BACKUP.md).                                                                                                            |
| Price watching      | `PRICE_WATCH_ENABLED` is read by the checker but no route calls it. It does nothing today.                                                                                      |

---

## Start it

```bash
git clone https://github.com/24Skater/home-asset-keeper.git
cd home-asset-keeper
docker compose up -d
```

Open **http://localhost:3000**, create an account (password must be at least 12
characters), then create your first property.

### What just happened

1. Docker built the image from `Dockerfile` in two stages. The build stage ran
   `npm ci` and `npm run build` with `VITE_STORAGE_PROVIDER=api` set, then
   pruned dev dependencies.
2. The runtime stage copied `node_modules`, `dist`, `server` and
   `src/types`, created `/app/data`, and set the container to run as the
   unprivileged `node` user under `tini`.
3. Compose created a named volume for `/app/data` and started the container with
   `NODE_ENV=production`, `DATABASE_URL=file:/app/data/brassworth.db` and
   `SESSION_TTL_HOURS=168`.
4. On startup the server opened the database, created any missing tables, then
   began serving `./dist` with a client-side-routing fallback and the API under
   `/api`. It logs `Brassworth listening on http://localhost:3000`.

Confirm it is alive:

```bash
docker compose ps
curl http://localhost:3000/api/health
```

The health endpoint returns `{"ok":true}`.

---

## The build-time variable that trips everyone up

`VITE_STORAGE_PROVIDER` is **not** a runtime setting. Vite substitutes
`import.meta.env` values into the bundle when the app is compiled, so the value
is frozen into the JavaScript at build time. The `Dockerfile` sets
`ENV VITE_STORAGE_PROVIDER=api` immediately before `npm run build`, which is why
the image talks to the server.

Putting `VITE_STORAGE_PROVIDER` in a `.env` file, in `docker-compose.yml`, or in
`docker run -e` **does nothing at all**. The bundle has already been built. The
same is true of every other `VITE_`-prefixed variable, including
`VITE_API_BASE_URL` (left empty in the image, which means "same origin").

| Kind                         | Where it is read                              | How to change it                                         |
| ---------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| `VITE_*`                     | Compiled into the browser bundle              | Change it before `npm run build`, then rebuild the image |
| Everything else on this page | Read by the Node process from the environment | Set it in `docker-compose.yml` or `.env` and restart     |

---

## Where your data lives

| Thing                                       | Value                              |
| ------------------------------------------- | ---------------------------------- |
| Volume, as declared in `docker-compose.yml` | `brassworth-data`                  |
| Mount point in the container                | `/app/data`                        |
| Database file                               | `/app/data/brassworth.db`          |
| Owner inside the container                  | the image's `node` user (uid 1000) |

Compose prefixes volume names with the project name, so the real volume is
usually `home-asset-keeper_brassworth-data`. Find the exact name before you use
it in a `docker run` command:

```bash
docker volume ls --filter name=brassworth-data
docker compose exec brassworth ls -l /app/data
```

Without that volume the database is written into the container's writable layer
and is destroyed with the container. This is the single most common way people
lose everything.

---

## Environment variables

Everything the server actually reads. Nothing else in the environment has any
effect.

### Core

| Variable            | Required       | Default                                                                     | What it does                                                                                                         |
| ------------------- | -------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | No             | `file:./data/brassworth.db` (the image sets `file:/app/data/brassworth.db`) | Where the database is. Accepts `file:`, `:memory:` and `libsql://`.                                                  |
| `PORT`              | No             | `3000`                                                                      | Port the Node process listens on.                                                                                    |
| `STATIC_ROOT`       | No             | `./dist`                                                                    | Directory the built app is served from. If it does not exist the server logs a warning and serves the API only.      |
| `NODE_ENV`          | No, but set it | unset                                                                       | `production` is the only value that marks the session cookie `Secure`. See [below](#why-node_envproduction-matters). |
| `SESSION_TTL_HOURS` | No             | `168`                                                                       | Session lifetime, in hours. Also sets the cookie's `Max-Age`.                                                        |

### Single sign-on

| Variable             | Required | Default                  | What it does                                                                               |
| -------------------- | -------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| `OIDC_ISSUER`        | For OIDC | unset                    | Issuer URL used for discovery, for example `https://accounts.google.com`.                  |
| `OIDC_CLIENT_ID`     | For OIDC | unset                    | Client id from your provider.                                                              |
| `OIDC_CLIENT_SECRET` | For OIDC | unset                    | Client secret from your provider.                                                          |
| `OIDC_REDIRECT_URI`  | For OIDC | unset                    | Must be exactly the URI registered with the provider, ending in `/api/auth/oidc/callback`. |
| `OIDC_LABEL`         | No       | `your identity provider` | Text shown on the sign-in button.                                                          |
| `OIDC_PROVIDER`      | No       | `oidc`                   | Stable key that account links are stored against. Changing it orphans existing links.      |

The first four are read together. If any one of them is missing, single sign-on
is disabled entirely and the OIDC routes answer 404 rather than half-working.

### Vendor gear catalogue

| Variable                        | Required        | Default            | What it does                                                                                                       |
| ------------------------------- | --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `GEAR_CATALOGUE_URL`            | For a catalogue | unset              | URL of a JSON catalogue document. Unset means the feature is off and `/api/catalogue` reports `configured: false`. |
| `GEAR_CATALOGUE_NAME`           | No              | `Vendor catalogue` | Name shown for the source.                                                                                         |
| `GEAR_CATALOGUE_API_KEY`        | No              | unset              | Key sent with the request. It stays on the server; a browser cannot hold a secret.                                 |
| `GEAR_CATALOGUE_API_KEY_HEADER` | No              | `Authorization`    | Header the key is sent in.                                                                                         |
| `GEAR_CATALOGUE_API_KEY_FORMAT` | No              | `Bearer {key}`     | How the key is written into that header. `{key}` is replaced.                                                      |

See [Gear catalogue](./CATALOGUE.md) for the document format.

### Reserved

| Variable              | Status                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `PRICE_WATCH_ENABLED` | Reserved. The price checker reads it, but nothing calls the checker. Setting it changes nothing. |

### What `docker-compose.yml` passes through

The shipped compose file sets `NODE_ENV`, `DATABASE_URL` and `SESSION_TTL_HOURS`
directly, and interpolates `PORT`, `SESSION_TTL_HOURS` and the six `OIDC_*`
variables from a `.env` file sitting next to it. The `GEAR_CATALOGUE_*`
variables are not in the compose file at all; add them to the `environment:`
block yourself if you want them.

`PORT` in that `.env` changes only the **host** side of the port mapping
(`${PORT:-3000}:3000`). The container always listens on 3000.

---

## Why `NODE_ENV=production` matters

The server marks the session cookie `Secure` if and only if `NODE_ENV` is
exactly `production`:

```ts
secureCookies: process.env.NODE_ENV === 'production',
```

`Secure` tells the browser never to send the cookie over plain HTTP. Without it,
a deployment sitting behind HTTPS is still handing out cookies that would travel
in the clear the moment anything reaches it over `http://`. The shipped compose
file sets it for you. If you write your own `docker run`, set it yourself.

The trade-off cuts the other way on a LAN. A browser will not store a `Secure`
cookie from `http://192.168.1.50:3000`, so sign-in appears to do nothing.
`http://localhost:3000` works because browsers treat localhost as a trustworthy
origin. Either put the app behind HTTPS, or, for a throwaway LAN trial only,
override `NODE_ENV` to `development` and accept a cookie that is not marked
`Secure`. `NODE_ENV` is not read anywhere else in the server, so nothing else
changes.

---

## Putting it behind HTTPS

**Do not use `docker-compose.prod.yml`.** It is left over from an older
static-file deployment and is broken in three separate ways: `nginx.prod.conf`
proxies to `frontend:80` while the image listens on 3000 and runs no nginx; the
`frontend` service declares no volume, so the database dies with the container;
and it sets no `DATABASE_URL`. Both files are on their way out.

Run the ordinary `docker-compose.yml` and point your own proxy at port 3000.

First, stop publishing the port to the world. If the proxy runs on the same
host, bind the container to loopback in `docker-compose.yml`:

```yaml
ports:
  - '127.0.0.1:3000:3000'
```

### Caddy

Caddy gets certificates on its own, which makes it the shortest correct answer:

```caddyfile
gear.example.com {
    encode gzip
    request_body {
        max_size 50MB
    }
    reverse_proxy 127.0.0.1:3000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }
}
```

### nginx

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name gear.example.com;

    ssl_certificate     /etc/letsencrypt/live/gear.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gear.example.com/privkey.pem;

    # Photos are stored inline as data: URLs, and a whole-collection write sends
    # every record at once. The nginx default of 1m rejects a single photo.
    client_max_body_size 50m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name gear.example.com;
    return 301 https://$host$request_uri;
}
```

The app does not read `X-Forwarded-Proto` today; whether the cookie is `Secure`
depends only on `NODE_ENV`. The headers are still worth setting for anything
downstream that does read them.

### Headers worth setting, and why

| Header                      | Value                                      | Why                                                                                         |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`      | Stops a later `http://` visit from being downgradable. Add `preload` only when you mean it. |
| `X-Content-Type-Options`    | `nosniff`                                  | The app serves user-supplied documents; sniffing turns an upload into an execution.         |
| `X-Frame-Options`           | `DENY`                                     | Nothing here is meant to be framed.                                                         |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`          | Item ids are in URLs and do not belong in an outbound `Referer`.                            |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()` | The app asks for none of these.                                                             |

### Content-Security-Policy

A build of the app contains exactly one script tag, external, with no inline
script, so a strict `script-src` is achievable. Start here:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
worker-src 'self' blob:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

Two things to know before you paste it in:

- `style-src` needs `'unsafe-inline'`. The UI primitives set inline style
  attributes for positioning and animation.
- `img-src` needs `data:` and `blob:`. Photos are stored as base64 `data:` URLs
  inside the record, not as files.
- Receipt scanning and OCR load code from public CDNs at the moment they are
  first used: `tesseract.js` fetches its worker, its wasm core and its language
  data from `https://cdn.jsdelivr.net`, and the PDF reader loads its worker from
  `https://cdnjs.cloudflare.com`. If you use those features, add both hosts to
  `script-src`, `worker-src` and `connect-src`. If you do not, leave them out and
  the rest of the app is unaffected.

Load the app with the browser console open after changing the policy. A CSP that
silently blocks a worker looks exactly like a feature that is broken.

---

## Single sign-on, end to end

Worked through with Google. Any OIDC provider that publishes a discovery
document works the same way.

1. In the Google Cloud console, create an OAuth 2.0 Client ID of type
   **Web application**.
2. Add one authorised redirect URI, exactly:
   `https://gear.example.com/api/auth/oidc/callback`. It must match
   `OIDC_REDIRECT_URI` character for character, including scheme, host, port and
   the absence of a trailing slash.
3. Put the values in a `.env` next to `docker-compose.yml`:

   ```bash
   OIDC_ISSUER=https://accounts.google.com
   OIDC_CLIENT_ID=your-client-id.apps.googleusercontent.com
   OIDC_CLIENT_SECRET=your-client-secret
   OIDC_REDIRECT_URI=https://gear.example.com/api/auth/oidc/callback
   OIDC_LABEL=Google
   OIDC_PROVIDER=google
   ```

4. Restart: `docker compose up -d`.
5. Check it took:

   ```bash
   curl https://gear.example.com/api/auth/oidc/status
   ```

   Expect `{"enabled":true,"label":"Google"}`. If you get `{"enabled":false}`,
   one of the first four variables is missing or empty.

6. Sign in. The button sends the browser to
   `/api/auth/oidc/start`, which requests scopes `openid email profile` with
   PKCE (S256), a nonce, and a single-use `state` that expires after ten
   minutes. On success the browser lands on `/dashboard`.

How an identity maps onto a local account:

| Situation                                                                           | Result                                                                        |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| This provider subject has signed in before                                          | Signed in as the linked account.                                              |
| New subject, its email matches a local account, provider says the email is verified | Linked to that account.                                                       |
| New subject, its email matches a local account, email not verified                  | Refused. An unverified address must not be able to claim an existing account. |
| New subject, no matching email                                                      | A new account is created.                                                     |

Two consequences worth knowing. An account created this way has no password, so
signing in with a password tells you to use your identity provider instead.
And discovery is fetched once and cached for the life of the process, so
changing `OIDC_ISSUER` needs a restart.

---

## Health checks and logs

| Command                                                       | What it tells you                             |
| ------------------------------------------------------------- | --------------------------------------------- |
| `docker compose ps`                                           | Running state and health status.              |
| `docker compose logs -f brassworth`                           | Live logs. The service is named `brassworth`. |
| `curl http://localhost:3000/api/health`                       | `{"ok":true}` when the process is serving.    |
| `docker inspect --format '{{json .State.Health}}' brassworth` | The last few health probe results.            |

The image ships its own `HEALTHCHECK`: it calls `/api/health` every 30 seconds
with a 5 second timeout, allows 10 seconds of start-up grace, and marks the
container unhealthy after 3 consecutive failures. Point your uptime monitor at
the same endpoint. It touches no database, so it answers even when something
else is wrong; watch the logs for the rest.

---

## Upgrading

```bash
cd home-asset-keeper
docker compose down
git pull
docker compose build --pull
docker compose up -d
```

Your data is in the named volume, not the container, so replacing the container
leaves it untouched. Take a backup first anyway, from
[Backup and restore](./BACKUP.md) — thirty seconds against the alternative.

Schema changes are applied on startup: tables are created if absent and missing
columns are added in place. There is no down migration and no automatic
downgrade, so once a newer version has opened the database, going back to an
older image is not supported. That is the reason for the backup.

---

## Using an external database

`DATABASE_URL` selects the target.

| Form        | Example                        | Notes                                                                 |
| ----------- | ------------------------------ | --------------------------------------------------------------------- |
| `file:`     | `file:/app/data/brassworth.db` | The default. Fastest, no network, backed up by copying one volume.    |
| `:memory:`  | `:memory:`                     | Everything is lost on restart. Used by tests; never for a deployment. |
| `libsql://` | `libsql://your-db.example.net` | A hosted libSQL server. The volume becomes unnecessary.               |

The compose file hardcodes the file URL, so switching means editing the
`environment:` block.

One caveat before you plan on a hosted database: the client is constructed with
the URL alone. There is no `DATABASE_URL_AUTH_TOKEN` or equivalent, so a
provider that requires a separate auth token cannot be configured today unless
the token can be carried in the URL itself.

---

## Static hosting is local-first mode only

You can put the built app on Netlify, Vercel, GitHub Pages, S3 or any other
static host. What you get there is **local-first mode**: a browser-only app that
keeps everything in that one browser, on that one machine, under
`localStorage`. No accounts anywhere, no server, no shared data. Its sign-in
screen is not a security boundary; it is a records-in-the-browser convenience.

Server mode cannot be deployed to a static host. There is nothing to deploy: the
app in server mode is a client for a Node process that owns the database,
enforces roles and issues session cookies. A static host runs no process. If you
want the server somewhere other than your own hardware, run this container on a
host that can run containers.

---

## Troubleshooting

### The container will not start, or restarts in a loop

```bash
docker compose logs --tail=50 brassworth
```

Read the last error before guessing. The usual causes are the port already being
taken, a bind mount that the `node` user cannot write to, and a `DATABASE_URL`
pointing somewhere that does not exist.

### Port already in use

`Bind for 0.0.0.0:3000 failed: port is already allocated`. Move the host side:

```bash
echo 'PORT=8085' >> .env
docker compose up -d
```

Then use `http://localhost:8085`. The container still listens on 3000; only the
published port changed. Do not set `PORT` in the container's `environment:`
unless you also change the port mapping and the health check target.

### Signed in, nothing happens, back at the sign-in screen

Almost always the `Secure` cookie. You are reaching the app over plain HTTP at
something other than `localhost`, so the browser discards the session cookie.
Put it behind HTTPS, or override `NODE_ENV` for a LAN-only trial. See
[Why `NODE_ENV=production` matters](#why-node_envproduction-matters).

### Cannot create an account

Signup requires a name, a valid email address, and a password of **at least 12
characters**. A shorter password is rejected with exactly that message. If you
get "That email address is already registered", the account exists but there is
no password reset route.

### OIDC redirect mismatch

The provider returns a `redirect_uri_mismatch` error, or the callback lands on
"That sign-in attempt has expired."

| Check       | Detail                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exact match | `OIDC_REDIRECT_URI` and the URI registered with the provider must be identical, including `https` versus `http`, port, and trailing slash.                               |
| Path        | It ends in `/api/auth/oidc/callback`.                                                                                                                                    |
| Restart     | Discovery is cached for the life of the process; changing `OIDC_ISSUER` needs `docker compose up -d`.                                                                    |
| Timing      | The sign-in attempt is single-use and expires after ten minutes. Starting a second attempt in another tab invalidates neither, but reusing a callback URL does not work. |

### The database is not persisting

Data disappears on `docker compose down` or after a rebuild.

| Cause                                 | Fix                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| No volume                             | You started the container with `docker run` and no `-v`. Use `docker compose up -d`, or mount `/app/data`. |
| `DATABASE_URL` outside the mount      | It must point inside `/app/data`. Anything else lives in the container layer.                              |
| Bind mount the container cannot write | A host directory mounted at `/app/data` must be writable by uid 1000: `sudo chown -R 1000:1000 ./data`.    |
| Wrong volume removed                  | `docker compose down -v` deletes the volume and everything in it. There is no undo.                        |

### Every route except the home page returns the API's 404

The server logs `No built frontend at ./dist; serving the API only.` The image
build did not produce `dist`, or `STATIC_ROOT` points at the wrong place.
Rebuild with `docker compose build --no-cache`.

### The catalogue button reports an error

`GET /api/catalogue` returns the reason. `configured: false` means
`GEAR_CATALOGUE_URL` is unset. A 400 means the URL or the returned document was
refused; a 502 means the fetch itself failed.

---

## Related

- [Backup and restore](./BACKUP.md) — keeping your data, and moving it between modes
- [Gear catalogue](./CATALOGUE.md) — where profiles come from and how they are licensed
- [Security](../SECURITY.md) — what each mode protects, and how to report a vulnerability
- [All documentation](./INDEX.md)

Verified against the code on 2026-09-05.
