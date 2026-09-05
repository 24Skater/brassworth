# Brassworth — one image serving the API and the built app on one origin.
#
# Same origin is the point: the session cookie needs no cross-site
# configuration, and a self-hoster runs one container rather than wiring a
# reverse proxy between two.

# --- Build ---
FROM node:22-alpine AS build

WORKDIR /app

# Dependencies first, so a source change does not re-resolve the tree.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The app is built to talk to the API on its own origin, so no base URL is set.
ENV VITE_STORAGE_PROVIDER=api
RUN npm run build

# Prune rather than reinstall: `npm ci --omit=dev` wipes node_modules and
# re-resolves, which loses the platform binaries libSQL already placed there.
RUN npm prune --omit=dev

# --- Run ---
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# tini reaps zombies and passes signals through, so the container stops cleanly.
RUN apk add --no-cache tini

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/types ./src/types
COPY --from=build /app/package.json ./package.json

# The database lives on a volume; without one, data dies with the container.
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]

ENV DATABASE_URL=file:/app/data/brassworth.db
ENV PORT=3000
EXPOSE 3000

# Unprivileged: nothing here needs root.
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "server/index.ts"]
