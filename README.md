[Русский](ruREADME.md) | **English** | [Français](frREADME.md) | [Español](spREADME.md) | [中文](zhREADME.md) | [العربية](arREADME.md)

# LiveKit PWA

![Preview](./public/images/preview.png)

Unofficial client for [LiveKit Meet](https://github.com/livekit-examples/meet) — a
self-hosted video conferencing server, built as a lighter alternative to Jitsi.
It comes with a built-in **authorization system**, **room moderation**, and
**lower server resource usage**, letting it run even on a modest server.

## Features

- Authorization.
- Ability to invite guests into a room without an account.
- Ability to create password-protected and admin-only rooms.
- Room moderation features.
- Chat with attachment support.
- 6 interface languages, dark theme, PWA (installable as a phone app).

# Installation

The app needs two required parts: the [**LiveKit media server**](https://github.com/livekit/livekit) (server) and the
**web app** (client).

For all components to work and for optimal web interface performance, additional dependencies are required:
- **livekit-vad** — voice-only transmission (advanced noise suppression)
- **livekit-egress** — conference recording service
- **Redis** — for request caching


## Option 1. Docker (recommended)

1. Create a settings file from the template:

   ```bash
   cp .env.example .env
   ```

   In `.env`, set:
   - `LIVEKIT_API_SECRET` — a long random secret (`openssl rand -hex 32`);
   - `AUTH_SECRET` — a random secret for session cookies (`openssl rand -hex 32`);
   - `LIVEKIT_URL` — the public LiveKit address for the browser (`wss://your-domain`;
     for testing on a single machine — `ws://localhost:7880`).


2. Bring up the module set you need via profiles. **Important:** in Docker
   Compose v2, the `--profile` flag must be placed **before** the `up` command, not after —
   `docker compose up -d --profile vad` will return `unknown flag: --profile`.

   ```bash
   docker compose up -d                              # base: calls, chat, authorization
   docker compose --profile vad up -d                # + voice detection (VAD)
   docker compose --profile recording up -d          # + conference recording
   docker compose --profile vad --profile recording up -d   # everything at once
   ```

   Profiles can be combined in any way. As an alternative, set them via the
   `COMPOSE_PROFILES` environment variable (e.g. in `.env`):

   ```bash
   COMPOSE_PROFILES=vad,recording docker compose up -d
   ```

   If profiles are enabled, `--profile ...` (or `COMPOSE_PROFILES` in `.env`) must
   also be given in subsequent commands (`restart`, `pull`, `down`) — otherwise Compose
   won't see them, and e.g. `down` won't stop the profiled services.


### **Management** — using regular Compose commands:

```bash
docker compose up -d --build                 # rebuild the web image and start
docker compose restart                       # restart without rebuilding
docker compose pull && docker compose up -d  # update images from the registry
```

## Option 2. Native installation

Requires [Bun](https://bun.sh), plus a pre-installed LiveKit server.

```bash
bun install
bun run build
bun run start
```

Settings are read from `.env.local` in the project root; the template is in `.env.example`.
```bash
   cp .env.example .env.local
```
For it to work correctly, don't forget to start the [LiveKit](https://github.com/livekit/livekit) server.
