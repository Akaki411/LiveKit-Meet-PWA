[Русский](ruREADME.md) | [English](README.md) | [Français](frREADME.md) | **Español** | [中文](zhREADME.md) | [العربية](arREADME.md)

# LiveKit PWA

![Vista previa](./public/images/preview.png)

Cliente no oficial de [LiveKit Meet](https://github.com/livekit-examples/meet) — un
servidor de videoconferencias autoalojado, creado como una alternativa más ligera a
Jitsi. Se distingue por su **sistema de autorización** integrado, su **sistema de
moderación** y su **menor consumo de recursos del servidor**, lo que permite
ejecutarlo incluso en un servidor modesto.

## Funcionalidades

- Autorización.
- Posibilidad de invitar a invitados a una sala sin necesidad de cuenta.
- Posibilidad de crear salas protegidas por contraseña y solo para administradores.
- Funciones de moderación de salas.
- Chat con soporte de archivos adjuntos.
- 6 idiomas de interfaz, tema oscuro, PWA (instalable como aplicación en el teléfono).

# Instalación

La aplicación necesita dos partes obligatorias: el [**servidor multimedia LiveKit**](https://github.com/livekit/livekit) (servidor) y la **aplicación web** (cliente).

Para que todos los componentes funcionen y para optimizar la interfaz web se requieren dependencias adicionales:
- **livekit-vad** — transmisión de solo voz (supresión de ruido avanzada)
- **livekit-egress** — servicio de grabación de conferencias
- **Redis** — para el almacenamiento en caché de solicitudes


## Opción 1. Docker (recomendado)

1. Cree un archivo de configuración a partir de la plantilla:

   ```bash
   cp .env.example .env
   ```

   En `.env`, configure:
   - `LIVEKIT_API_SECRET` — un secreto largo y aleatorio (`openssl rand -hex 32`);
   - `AUTH_SECRET` — un secreto aleatorio para las cookies de sesión (`openssl rand -hex 32`);
   - `LIVEKIT_URL` — la dirección pública de LiveKit para el navegador (`wss://su-dominio`;
     para pruebas en una sola máquina — `ws://localhost:7880`).


2. Levante el conjunto de módulos que necesite mediante perfiles. **Importante:** en
   Docker Compose v2, la opción `--profile` debe colocarse **antes** del comando `up`,
   no después — `docker compose up -d --profile vad` devolverá `unknown flag: --profile`.

   ```bash
   docker compose up -d                              # básico: llamadas, chat, autorización
   docker compose --profile vad up -d                # + detección de voz (VAD)
   docker compose --profile recording up -d          # + grabación de conferencias
   docker compose --profile vad --profile recording up -d   # todo a la vez
   ```

   Los perfiles se pueden combinar de cualquier forma. Como alternativa, defínalos
   mediante la variable de entorno `COMPOSE_PROFILES` (por ejemplo, en `.env`):

   ```bash
   COMPOSE_PROFILES=vad,recording docker compose up -d
   ```

   Si los perfiles están activados, `--profile ...` (o `COMPOSE_PROFILES` en `.env`)
   también debe indicarse en los comandos posteriores (`restart`, `pull`, `down`); de lo
   contrario, Compose no los verá y, por ejemplo, `down` no detendrá los servicios de esos perfiles.


3. Coloque un proxy inverso TLS delante de la aplicación (`LIVEKIT_URL` arriba no
   tiene puerto porque el proxy expone LiveKit en el puerto estándar `443`, no `7880`
   — la biblioteca cliente añade `/rtc` por sí misma). Ejemplo de configuración de nginx:

   ```nginx
   server {
       listen 443 ssl;
       server_name meet.your-domain;
       ssl_certificate     /path/to/fullchain.pem;
       ssl_certificate_key /path/to/privkey.pem;

       # Señalización de LiveKit (WebSocket) + API => livekit-server
       location /rtc   { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; proxy_read_timeout 3600s; proxy_send_timeout 3600s; }
       location /twirp { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; }

       # Frontend de Meet => contenedor web.
       location / {
           proxy_pass http://127.0.0.1:3000;
           include snippets/proxy.conf;
           proxy_hide_header Permissions-Policy;
           add_header Permissions-Policy "microphone=(self), camera=(self)" always;
       }
   }
   ```

   Si está detrás de una cascada NAT (por ejemplo, un servidor doméstico redirigido
   a través de un VPS independiente que posee la IP pública real), consulte también
   `LIVEKIT_USE_EXTERNAL_IP` / `LIVEKIT_NODE_IP` en `.env.example` — la autodetección
   de IP mediante STUN de LiveKit encontrará la IP de su ISP, no la del VPS, lo que
   rompe el audio/vídeo incluso cuando la señalización funciona correctamente.

### **Gestión** — con los comandos habituales de Compose:

```bash
docker compose up -d --build                 # reconstruir la imagen web e iniciar
docker compose restart                       # reiniciar sin reconstruir
docker compose pull && docker compose up -d  # actualizar imágenes desde el registro
```

## Opción 2. Instalación nativa

Requiere [Bun](https://bun.sh), además de un servidor LiveKit preinstalado.

```bash
bun install
bun run build
bun run start
```

La configuración se lee desde `.env.local` en la raíz del proyecto; la plantilla está en `.env.example`.
```bash
   cp .env.example .env.local
```
Para un funcionamiento correcto, no olvide iniciar el servidor [LiveKit](https://github.com/livekit/livekit).
