FROM node:22-bookworm AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
RUN npm_config_build_from_source=true pnpm rebuild bcrypt sqlite3
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/.env.example ./.env.example
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p config data static
VOLUME ["/app/config", "/app/data", "/app/static"]
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["pnpm", "start"]
