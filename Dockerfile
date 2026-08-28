FROM oven/bun:1-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libfontconfig1 \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_SHOW_SETTINGS_MENU=true
ARG NEXT_PUBLIC_LK_RECORD_ENDPOINT=/api/record
ARG NEXT_PUBLIC_DATADOG_CLIENT_TOKEN
ARG NEXT_PUBLIC_DATADOG_SITE
ENV NEXT_PUBLIC_SHOW_SETTINGS_MENU=$NEXT_PUBLIC_SHOW_SETTINGS_MENU \
    NEXT_PUBLIC_LK_RECORD_ENDPOINT=$NEXT_PUBLIC_LK_RECORD_ENDPOINT \
    NEXT_PUBLIC_DATADOG_CLIENT_TOKEN=$NEXT_PUBLIC_DATADOG_CLIENT_TOKEN \
    NEXT_PUBLIC_DATADOG_SITE=$NEXT_PUBLIC_DATADOG_SITE

RUN bun node_modules/rari/dist/cli.mjs build

FROM oven/bun:1-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libfontconfig1 \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    RENDER=1

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/index.html ./index.html

RUN mkdir -p data static recordings
VOLUME ["/app/data", "/app/static", "/app/recordings"]

EXPOSE 3000

CMD ["bun", "node_modules/rari/dist/cli.mjs", "start"]
