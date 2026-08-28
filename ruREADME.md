**Русский** | [English](README.md) | [Français](frREADME.md) | [Español](spREADME.md) | [中文](zhREADME.md) | [العربية](arREADME.md)

# LiveKit PWA

![Превью](./public/images/preview.png)

Неофициальный клиент для [LiveKit Meet](https://github.com/livekit-examples/meet) —
самостоятельный сервер видеоконференций, созданный как более лёгкая альтернатива Jitsi.
Отличается встроенной **системой авторизации**, **системой модерации** и **меньшим потреблением ресурсов сервера**, что
позволяет держать его даже на слабом сервере.

## Возможности

- Авторизация.
- Возможность приглашать гостей в комнату без аккаунта.
- Возможность создания комнат с паролем и только для админов.
- Возможности модерации комнат.
- Чат с поддержкой вложений.
- 6 языков интерфейса, тёмная тема.

# Установка

Приложению нужны две обязательные части: [**медиасервер LiveKit**](https://github.com/livekit/livekit) (сервер) и
**веб-приложение** (клиент). 

Также для работы всех компонентов и оптимизации работы веб интерфейса требуются дополнительные зависимости:
- **livekit-vad** - передача только голоса (продвинутое шумоподавление)
- **livekit-egress** - сервис записи конференций
- **Redis** - для кеширования запросов


## Вариант 1. Docker (рекомендуется)

1. Создайте файл настроек из шаблона:

   ```bash
   cp .env.example .env
   ```

   В `.env` задайте:
   - `LIVEKIT_API_SECRET` — длинный случайный секрет (`openssl rand -hex 32`);
   - `AUTH_SECRET` — случайный секрет для куки-сессий (`openssl rand -hex 32`);
   - `LIVEKIT_URL` — публичный адрес LiveKit для браузера (`wss://ваш-домен`;
     для проверки на одной машине — `ws://localhost:7880`).


2. Поднимите нужный набор модулей через профили. **Важно:** флаг `--profile` в Docker
   Compose v2 указывается **перед** командой `up`, а не после неё — `docker compose up -d
   --profile vad` вернёт `unknown flag: --profile`.

   ```bash
   docker compose up -d                              # базовый: звонки, чат, авторизация
   docker compose --profile vad up -d                # + детекция голоса (VAD)
   docker compose --profile recording up -d          # + запись конференций
   docker compose --profile vad --profile recording up -d   # всё сразу
   ```

   Профили комбинируются в любом сочетании. Как альтернатива — задать их через
   переменную окружения `COMPOSE_PROFILES` (например, в `.env`):

   ```bash
   COMPOSE_PROFILES=vad,recording docker compose up -d
   ```

   Если профили включены, `--profile ...` (или `COMPOSE_PROFILES` в `.env`) нужно
   указывать и в последующих командах (`restart`, `pull`, `down`) — иначе Compose
   их не увидит и, например, `down` не остановит профильные сервисы.


3. Разместите перед приложением TLS reverse proxy (у `LIVEKIT_URL` выше нет
   порта, потому что прокси открывает LiveKit на стандартном `443`, а не `7880` —
   клиентская библиотека сама добавляет `/rtc`). Пример конфига nginx:

   ```nginx
   server {
       listen 443 ssl;
       server_name meet.your-domain;
       ssl_certificate     /path/to/fullchain.pem;
       ssl_certificate_key /path/to/privkey.pem;

       # Сигналинг LiveKit (WebSocket) + API => livekit-server
       location /rtc   { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; proxy_read_timeout 3600s; proxy_send_timeout 3600s; }
       location /twirp { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; }

       # Фронтенд Meet => контейнер web.
       location / {
           proxy_pass http://127.0.0.1:3000;
           include snippets/proxy.conf;
           proxy_hide_header Permissions-Policy;
           add_header Permissions-Policy "microphone=(self), camera=(self)" always;
       }
   }
   ```

   Если сервер работает за каскадом NAT (например, домашний сервер, проброшенный
   через отдельный VPS, которому принадлежит реальный публичный IP), смотрите также
   `LIVEKIT_USE_EXTERNAL_IP` / `LIVEKIT_NODE_IP` в `.env.example` — автоопределение
   внешнего IP через STUN у LiveKit найдёт IP вашего провайдера, а не VPS, из-за чего
   аудио/видео сломается даже при рабочем сигналинге.

### **Управление** — обычными командами Compose:

```bash
docker compose up -d --build                 # пересобрать веб-образ и запустить
docker compose restart                       # перезапуск без пересборки
docker compose pull && docker compose up -d  # обновить образы из реестра
```

## Вариант 2. Нативная установка

Требуется [Bun](https://bun.sh), а также предустановленный LiveKit-сервер.

```bash
bun install
bun run build
bun run start
```

Настройки читаются из `.env.local` в корне проекта, шаблон находится в файле `.env.example`.
```bash
   cp .env.example .env.local
```
Для корректной работы не забудьте запустить сервер [LiveKit](https://github.com/livekit/livekit)
