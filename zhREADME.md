[Русский](ruREADME.md) | [English](README.md) | [Français](frREADME.md) | [Español](spREADME.md) | **中文** | [العربية](arREADME.md)

# LiveKit PWA

![预览](./public/images/preview.png)

[LiveKit Meet](https://github.com/livekit-examples/meet) 的非官方客户端 —— 一个自托管的视频会议服务器，
作为 Jitsi 的更轻量级替代方案而打造。内置**授权系统**、**房间管理系统**，并且**服务器资源占用更低**，
即使在性能较弱的服务器上也能运行。

## 功能特性

- 用户授权。
- 支持在无账号的情况下邀请访客加入房间。
- 支持创建带密码的房间和仅限管理员的房间。
- 房间管理功能。
- 支持发送附件的聊天功能。
- 6 种界面语言、深色主题、PWA（可作为手机应用安装）。

# 安装

该应用需要两个必需部分：[**LiveKit 媒体服务器**](https://github.com/livekit/livekit)（服务端）和 **Web 应用**（客户端）。

为使所有组件正常运行并优化 Web 界面性能，还需要以下附加依赖：
- **livekit-vad** —— 仅传输语音（高级降噪）
- **livekit-egress** —— 会议录制服务
- **Redis** —— 用于请求缓存


## 方案一：Docker（推荐）

1. 从模板创建配置文件：

   ```bash
   cp .env.example .env
   ```

   在 `.env` 中设置：
   - `LIVEKIT_API_SECRET` —— 一个较长的随机密钥（`openssl rand -hex 32`）；
   - `AUTH_SECRET` —— 用于会话 Cookie 的随机密钥（`openssl rand -hex 32`）；
   - `LIVEKIT_URL` —— 浏览器访问的 LiveKit 公网地址（`wss://your-domain`；
     单机测试时使用 `ws://localhost:7880`）。


2. 通过配置文件（profiles）启动所需的模块组合。**注意：** 在 Docker
   Compose v2 中，`--profile` 参数必须放在 `up` 命令**之前**，而不是之后 ——
   `docker compose up -d --profile vad` 会返回 `unknown flag: --profile`。

   ```bash
   docker compose up -d                              # 基础功能：通话、聊天、授权
   docker compose --profile vad up -d                # + 语音检测（VAD）
   docker compose --profile recording up -d          # + 会议录制
   docker compose --profile vad --profile recording up -d   # 全部启用
   ```

   配置文件可以任意组合。也可以通过 `COMPOSE_PROFILES` 环境变量设置
   （例如写在 `.env` 中）：

   ```bash
   COMPOSE_PROFILES=vad,recording docker compose up -d
   ```

   如果启用了配置文件，后续命令（`restart`、`pull`、`down`）也需要带上
   `--profile ...`（或在 `.env` 中设置 `COMPOSE_PROFILES`）—— 否则 Compose
   将无法识别这些服务，例如 `down` 将不会停止对应配置文件下的服务。


3. 在应用前面部署一个 TLS 反向代理（上面的 `LIVEKIT_URL` 不带端口，
   因为代理会在标准的 `443` 端口暴露 LiveKit，而不是 `7880` ——
   客户端库会自行附加 `/rtc`）。nginx 配置示例：

   ```nginx
   server {
       listen 443 ssl;
       server_name meet.your-domain;
       ssl_certificate     /path/to/fullchain.pem;
       ssl_certificate_key /path/to/privkey.pem;

       # LiveKit 信令（WebSocket）+ API => livekit-server
       location /rtc   { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; proxy_read_timeout 3600s; proxy_send_timeout 3600s; }
       location /twirp { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; }

       # Meet 前端 => web 容器。
       location / {
           proxy_pass http://127.0.0.1:3000;
           include snippets/proxy.conf;
           proxy_hide_header Permissions-Policy;
           add_header Permissions-Policy "microphone=(self), camera=(self)" always;
       }
   }
   ```

   如果您的服务器处于 NAT 级联之后（例如，家用服务器通过一台拥有真实公网 IP 的
   独立 VPS 转发），另请参阅 `.env.example` 中的 `LIVEKIT_USE_EXTERNAL_IP` /
   `LIVEKIT_NODE_IP` —— LiveKit 通过 STUN 自动探测到的会是您的运营商 IP，
   而不是 VPS 的 IP，这会导致即使信令正常，音视频依然无法工作。

### **管理** —— 使用常规 Compose 命令：

```bash
docker compose up -d --build                 # 重新构建 Web 镜像并启动
docker compose restart                       # 不重新构建，直接重启
docker compose pull && docker compose up -d  # 从镜像仓库更新镜像
```

## 方案二：原生安装

需要 [Bun](https://bun.sh)，以及预先安装好的 LiveKit 服务器。

```bash
bun install
bun run build
bun run start
```

配置从项目根目录下的 `.env.local` 读取，模板文件为 `.env.example`。
```bash
   cp .env.example .env.local
```
为确保正常运行，请不要忘记启动 [LiveKit](https://github.com/livekit/livekit) 服务器。
