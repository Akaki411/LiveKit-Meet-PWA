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
- 6 interface languages, dark theme.

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


3. Put a TLS reverse proxy in front of it (`LIVEKIT_URL` above has no
   port because the proxy exposes LiveKit at the standard `443`, not `7880` —
   the client library appends `/rtc` itself). Example nginx config:

   ```nginx
   server {
       listen 443 ssl;
       server_name meet.your-domain;
       ssl_certificate     /path/to/fullchain.pem;
       ssl_certificate_key /path/to/privkey.pem;

       # LiveKit signaling (WebSocket) + API => livekit-server
       location /rtc   { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; proxy_read_timeout 3600s; proxy_send_timeout 3600s; }
       location /twirp { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; }

       # Meet frontend => web container.
       location / {
           proxy_pass http://127.0.0.1:3000;
           include snippets/proxy.conf;
           proxy_hide_header Permissions-Policy;
           add_header Permissions-Policy "microphone=(self), camera=(self)" always;
       }
   }
   ```

   If you're running behind a NAT cascade (e.g. a home server forwarded
   through a separate VPS that owns the actual public IP), also see
   `LIVEKIT_USE_EXTERNAL_IP` / `LIVEKIT_NODE_IP` in `.env.example` — LiveKit's
   STUN auto-detection finds your ISP's IP, not the VPS's, which breaks
   audio/video even when signaling works fine.

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
