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
ARG NEXT_PUBLIC_SHOW_SETTINGS_MENU=true
ARG NEXT_PUBLIC_LK_RECORD_ENDPOINT=/api/record
ENV NEXT_PUBLIC_SHOW_SETTINGS_MENU=$NEXT_PUBLIC_SHOW_SETTINGS_MENU \
    NEXT_PUBLIC_LK_RECORD_ENDPOINT=$NEXT_PUBLIC_LK_RECORD_ENDPOINT
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
RUN mkdir -p data static recordings
VOLUME ["/app/data", "/app/static", "/app/recordings"]
EXPOSE 3000
CMD ["pnpm", "start"]
