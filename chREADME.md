# LiveKit PWA

![预览](./public/images/preview.png)

[LiveKit Meet](https://github.com/livekit-examples/meet) 的非官方客户端——
一个自托管的视频会议服务器，作为 Jitsi 的更轻量替代方案而构建。
它的亮点在于内置的**身份验证系统**、**审核系统**以及**更低的服务器资源占用**，
因此即使在配置较弱的服务器上也能运行。

## 功能

- 身份验证。
- 支持邀请没有账户的访客进入房间。
- 支持创建带密码的房间和仅限管理员的房间。
- 房间审核功能。
- 支持附件的聊天。
- 6 种界面语言、深色主题、PWA（可作为应用安装到手机上）。

# 安装

应用需要两个必备部分：[**LiveKit 媒体服务器**](https://github.com/livekit/livekit)（服务器）和
**Web 应用**（客户端）。

此外，为使所有组件正常工作并优化 Web 界面，还需要额外的依赖：
- **livekit-vad** — 仅传输语音（高级降噪）
- **livekit-egress** — 会议录制服务
- **Redis** — 用于缓存请求


## 方案 1. Docker（推荐）

1. 从模板创建配置文件：

   ```bash
   cp .env.example .env
   ```

   在 `.env` 中设置：
   - `LIVEKIT_API_SECRET` — 一个长的随机密钥（`openssl rand -hex 32`）；
   - `AUTH_SECRET` — 用于会话 Cookie 的随机密钥（`openssl rand -hex 32`）；
   - `LIVEKIT_URL` — 供浏览器使用的 LiveKit 公网地址（`wss://你的域名`；
     在单台机器上测试时为 `ws://localhost:7880`）。


2. 通过 profiles 启动你需要的模块组合：

   ```bash
   docker compose up -d /     # 基础：通话、聊天、身份验证
   --profile vad /            # + 语音检测（VAD）
   --profile recording        # + 会议录制
   ```

   profiles 可以组合使用，你可以只安装其中一部分，也可以一次性全部安装：

   `docker compose --profile recording --profile vad up -d`。


### **管理** — 使用常规的 Compose 命令：

```bash
docker compose up -d --build                 # 重新构建 Web 镜像并启动
docker compose restart                       # 不重新构建直接重启
docker compose pull && docker compose up -d  # 从镜像仓库更新镜像
```

## 方案 2. 原生安装

需要 Node.js ≥ 18 和 pnpm，以及一个已预先安装的 LiveKit 服务器。

```bash
pnpm install
pnpm build
pnpm start
```

配置从项目根目录的 `.env.local` 读取，模板位于 `.env.example` 文件中。
```bash
   cp .env.example .env.local
```
为保证正常运行，请不要忘记启动 [LiveKit](https://github.com/livekit/livekit) 服务器。
