# 服务器部署问题汇总与排查手册

> 项目：smart-task-board（NestJS 后端 + Next.js 前端 + PostgreSQL）
> 部署方式：Docker Compose 单台腾讯云轻量应用服务器（上海，Ubuntu 22.04，4C4G）
> 服务器 IP：124.223.192.177
> 访问地址：前端 http://124.223.192.177:3000，后端经代理 http://124.223.192.177:3000/api/backend

本文记录首次部署到服务器过程中踩过的坑与最终解决方案，便于后续排查。

---

## 一、环境准备阶段

### 1. Docker Hub 镜像拉取超时
**现象**：`docker compose up` 卡在拉 postgres 镜像。
**解决**：配置国内镜像加速器 `/etc/docker/daemon.json`，加入腾讯云 / 中科大 / 网易源，然后 `systemctl restart docker`。

### 3. apt 源慢、构建耗时过长
**现象**：Dockerfile 内 `apt-get update` 用 Debian 官方源，单次构建耗时 17 分钟。
**解决**：Dockerfile 内把 `deb.debian.org` / `security.debian.org` 换成腾讯镜像源，并设 npm 源：
```dockerfile
RUN sed -i 's|http://deb.debian.org/debian|http://mirrors.cloud.tencent.com/debian|g' /etc/apt/sources.list.d/debian.sources \
 && sed -i 's|http://security.debian.org/debian-security|http://mirrors.cloud.tencent.com/debian-security|g' /etc/apt/sources.list.d/debian.sources
RUN npm config set registry https://registry.npmmirror.com
```
构建时间降至约 2 分钟。

### 2. Prisma 报 Schema engine error（缺少 OpenSSL）
**现象**：后端容器启动后循环报错，Prisma 无法加载 query engine：
```
PrismaClientInitializationError: Schema engine error ... libssl.so.1.1 / openssl not found
```
**原因**：slim 镜像缺 OpenSSL 运行库（Prisma 编译后的 engine 依赖 OpenSSL）。
**解决**：Dockerfile 运行阶段安装 `openssl libssl-dev`：
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends openssl libssl-dev && rm -rf /var/lib/apt/lists/*
RUN npx prisma generate
```
重新构建后 `npx prisma migrate deploy` 成功（`All migrations successfully applied`）。

### 3. 前端构建失败：缺少 public 目录
**现象**：`docker compose build web` 报 `Could not find the 'public' directory ...`
**解决**：在 `web/` 下创建空的 `public` 目录后重新构建（创建目录本身即可，无需放文件）。

---

## 二、运行时问题

### 4. 后端只监听 localhost，容器外访问不到
**现象**：后端容器 Up，但浏览器访问接口超时；日志显示 `Application is running on: http://localhost:3001`。
**原因**：`backend/src/main.ts` 原代码 `app.listen(port)` 只绑定 127.0.0.1，容器外连不上。
**解决**：改为监听所有网卡：
```typescript
const port = Number(process.env.PORT) || 3001;
await app.listen(port, '0.0.0.0');
```
> 注意：Docker 构建会走缓存，代码改后必须用 `docker compose up -d --build backend`（必要时 `--no-cache`）才会生效。

### 5. 生产环境强制 HTTPS 重定向，导致 CORS 预检失败
**现象**：前端登录报错
```
Access to fetch at 'http://124.223.192.177:3001/...' has been blocked by CORS policy:
Redirect is not allowed for a preflight request.
```
**原因**：`main.ts` 里 `if (process.env.NODE_ENV === 'production')` 对所有 HTTP 请求做 301 重定向到 HTTPS。浏览器预检（OPTIONS）不允许被重定向，CORS 失败。
**解决**：改为由环境变量 `FORCE_HTTPS` 控制，默认关闭：
```typescript
const forceHttps = process.env.FORCE_HTTPS === 'true';
if (forceHttps) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}
```
后续若上 HTTPS（如 Nginx + 证书），在 docker-compose 的 backend 环境变量里设 `FORCE_HTTPS: 'true'` 即可。

### 6. 浏览器直连后端跨域失败（Provisional headers）
**现象**：前端直连 `http://124.223.192.177:3001/auth/login`（跨域），Network 显示 "Provisional headers are shown"，请求发不出去。但服务器上 `curl -X OPTIONS` / `curl -X POST` 均正常返回 CORS 头（说明后端本身没问题）。
**原因**：浏览器端对裸 IP + 非标准端口的跨域请求受安全策略影响，预检未真正通过。
**解决**：前端不走直连，改为**同域代理**，由 Next.js 服务端反代后端，彻底规避浏览器 CORS：
- `next.config.mjs` 已有 rewrite 规则（构建时把 `/api/backend/:path*` 代理到 `NEXT_PUBLIC_API_URL` 指向的后端）；
- 修改 `web/lib/api.ts`：
  ```typescript
  const BASE = '/api/backend';
  ```
- 浏览器实际请求变为 `http://124.223.192.177:3000/api/backend/auth/login`（同域），由 Next.js 服务端转发到后端。
- docker-compose 的 web 服务仍需在 build args / environment 里传 `NEXT_PUBLIC_API_URL=http://124.223.192.177:3001`，供 rewrite 使用。

> 排查技巧：`curl` 能通 ≠ 浏览器能通。浏览器 CORS 失败优先看 Network 面板里 OPTIONS 预检响应头，再看是否可改用同域代理。

---

## 三、运维操作速查

### 代码更新流程（标准）
```bash
# 本地 Mac 改代码
git add .
git commit -m "描述"
git push origin main

# 服务器
cd ~/projects/smart-task-board
git pull --no-rebase origin main
docker compose up -d --build backend   # 或 web / db
```

### 常用命令
| 目的 | 命令 |
|------|------|
| 查看容器状态 | `docker ps` / `docker ps -a` |
| 查看日志 | `docker compose logs -f <backend\|web\|db>` |
| 重建单个服务 | `docker compose up -d --build <服务名>` |
| 全量无缓存重建 | `docker compose down && docker compose build --no-cache && docker compose up -d` |
| 重启服务 | `docker compose restart <服务名>` |
| 测试后端接口 | `curl -X POST http://124.223.192.177:3001/auth/login -H "Content-Type: application/json" -d '{"username":"x","password":"y"}' -v` |

### 注意事项
- **不要在服务器直接改代码**，避免与本地不同步；所有代码改动走本地 → push → 服务器 pull。
- **部署配置**（Dockerfile、docker-compose.yml）留在服务器本地即可，不必回推 GitHub。
- **服务器网络不稳**时 Git 操作可能超时，重试即可。
- **防火墙**：腾讯云控制台需放行 TCP 3000 和 3001（来源 0.0.0.0/0）。
- SSH 断连（Broken pipe）可用腾讯云 **OrcaTerm** 网页终端登录。

### 最终关键 commit
- `b14d362` 后端监听 0.0.0.0
- `01bd4d7` HTTPS 重定向改为 FORCE_HTTPS 开关
- `afb93ff` 前端走同域 /api/backend 代理
