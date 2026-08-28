# LiveKit PWA

![Vista previa](./public/images/preview.png)

Un cliente no oficial para [LiveKit Meet](https://github.com/livekit-examples/meet):
un servidor de videoconferencias autoalojado, creado como una alternativa más ligera a Jitsi.
Destaca por su **sistema de autenticación** integrado, su **sistema de moderación** y su
**menor consumo de recursos del servidor**, lo que permite ejecutarlo incluso en un servidor modesto.

## Funciones

- Autenticación.
- Posibilidad de invitar a la sala a personas sin cuenta.
- Posibilidad de crear salas con contraseña y salas solo para administradores.
- Funciones de moderación de salas.
- Chat con soporte de archivos adjuntos.
- 6 idiomas de interfaz, tema oscuro, PWA (instalación como aplicación en el teléfono).

# Instalación

La aplicación necesita dos partes obligatorias: el [**servidor multimedia LiveKit**](https://github.com/livekit/livekit) (servidor) y
la **aplicación web** (cliente).

Además, para que todos los componentes funcionen y para optimizar la interfaz web se requieren dependencias adicionales:
- **livekit-vad** — transmisión solo de voz (supresión de ruido avanzada)
- **livekit-egress** — el servicio de grabación de conferencias
- **Redis** — para el almacenamiento en caché de las solicitudes


## Opción 1. Docker (recomendado)

1. Crea el archivo de configuración a partir de la plantilla:

   ```bash
   cp .env.example .env
   ```

   En `.env`, define:
   - `LIVEKIT_API_SECRET` — un secreto aleatorio largo (`openssl rand -hex 32`);
   - `AUTH_SECRET` — un secreto aleatorio para las cookies de sesión (`openssl rand -hex 32`);
   - `LIVEKIT_URL` — la dirección pública de LiveKit para el navegador (`wss://tu-dominio`;
     para pruebas en una sola máquina — `ws://localhost:7880`).


2. Levanta el conjunto de módulos que necesites mediante perfiles:

   ```bash
   docker compose up -d /     # base: llamadas, chat, autenticación
   --profile vad /            # + detección de voz (VAD)
   --profile recording        # + grabación de conferencias
   ```

   Los perfiles se combinan; puedes instalar una parte o todos a la vez:

   `docker compose --profile recording --profile vad up -d`.


### **Gestión** — con los comandos habituales de Compose:

```bash
docker compose up -d --build                 # reconstruir la imagen web y arrancar
docker compose restart                       # reiniciar sin reconstruir
docker compose pull && docker compose up -d  # actualizar las imágenes del registro
```

## Opción 2. Instalación nativa

Requiere Node.js ≥ 18 y pnpm, así como un servidor LiveKit ya instalado.

```bash
pnpm install
pnpm build
pnpm start
```

La configuración se lee desde `.env.local` en la raíz del proyecto; la plantilla está en el archivo `.env.example`.
```bash
   cp .env.example .env.local
```
Para que funcione correctamente, no olvides iniciar el servidor [LiveKit](https://github.com/livekit/livekit).
