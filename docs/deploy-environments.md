# 双环境部署（测试 / 生产）

本项目使用 Docker Compose 在同一台服务器上并行运行两个隔离环境：

| 环境 | 分支 | 部署目录 | 前端端口 | 后端端口 | 数据库对外端口 | 数据库名 |
|------|------|----------|----------|----------|--------------|----------|
| 测试 | `test` | `/opt/stb/test/test` | `3000` | `3001` | `5432` | `smart_task_board_test` |
| 生产 | `main` | `/opt/stb/prod/prod` | `3100` | `3101` | 不暴露 | `smart_task_board` |

两个环境使用**完全独立的容器、端口、数据库**，互不干扰。
宿主机端口错开，容器内通过独立 Docker 网络隔离。

## 自动化部署（GitHub Actions）

已配置 `.github/workflows/deploy.yml`：

- push 到 `test` 分支 → 部署测试环境，运行 `docker compose --env-file web/.env.test -f docker-compose.yml up -d --build`
- push 到 `main` 分支 → 部署生产环境，运行 `docker compose --env-file web/.env.prod -f docker-compose.prod.yml up -d --build`

部署前会先跑后端构建与单测、前端 lint、单测与生产构建；同一分支连续 push 时，只保留最新一次部署。

实际部署流程：

1. Actions checkout 当前 GitHub commit。
2. 将当前精确 commit SHA 推送到 Gitee 镜像仓库。
3. 轮询 Gitee API，确认镜像分支已同步到同一个 SHA。
4. SSH 到服务器，从 Gitee 下载该 SHA 的 tarball。
5. `rsync -a --delete` 同步到目标部署目录，保留生产 `.env.prod`、依赖目录、构建产物、数据目录和 `.git`。
6. Docker Compose 重新构建并后台启动。
7. 等待所有服务 running。
8. HTTP 健康检查：
   - 前端 `/login` 必须返回 `200`
   - 后端 `/health` 必须返回 `200`，并验证数据库连接

### 仓库 Secrets（Settings → Secrets and variables → Actions）

| Secret | 值 |
|--------|-----|
| `SERVER_HOST` | `124.223.192.177` |
| `SERVER_USER` | 服务器 SSH 用户名 |
| `SSH_PRIVATE_KEY` | 可登录服务器的私钥（公钥需已在服务器 `~/.ssh/authorized_keys`） |
| `GITEE_TOKEN` | 可推送 `mderp/smart-task-board` Gitee 镜像仓库的 token |

### 服务器一次性初始准备

```bash
# 1. 安装 Docker + compose plugin（略）

# 2. 创建部署目录
mkdir -p /opt/stb/test/test /opt/stb/prod/prod/backend /opt/stb/prod/prod/web

# 3. 生产环境需手动放置 .env.prod（不进 git，含强随机密钥）
cd /opt/stb/prod/prod
cat > backend/.env.prod <<'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@db:5432/smart_task_board?schema=public
JWT_ACCESS_SECRET=<用 openssl rand -base64 48 生成的强随机字符串>
JWT_REFRESH_SECRET=<用 openssl rand -base64 48 生成的另一段强随机字符串>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3101
CORS_ORIGIN=http://124.223.192.177:3100
FORCE_HTTPS=true
EOF
cat > web/.env.prod <<'EOF'
NEXT_PUBLIC_API_URL=http://124.223.192.177:3101
EOF
```

> ⚠️ 生产 `.env.prod` 必须预先存在，Actions 的 `docker compose up` 依赖它；测试环境用已提交的 `.env.test`，无需手动配置。

之后每次 `git push` 到对应分支即自动触发部署，无需手动登录服务器。

## 目录与分支约定

- 测试环境部署目录：`/opt/stb/test/test`
- 生产环境部署目录：`/opt/stb/prod/prod`
- 服务器不依赖本地 git checkout；Actions 通过 Gitee tarball 同步精确 commit。

## 测试环境

```bash
cd /opt/stb/test/test
docker compose --env-file web/.env.test -f docker-compose.yml up -d --build
```

- 访问：http://<服务器IP>:3000
- 反代后端：http://<服务器IP>:3001
- 配置来源：`backend/.env.test` + `web/.env.test`（已提交，弱密钥）

## 生产环境

生产配置 `backend/.env.prod` / `web/.env.prod` **不提交 git**，需手动放置到服务器并填入强密钥。

```bash
cd /opt/stb/prod/prod
# 确保 backend/.env.prod 与 web/.env.prod 已存在（含强随机 JWT 密钥）
docker compose --env-file web/.env.prod -f docker-compose.prod.yml up -d --build
```

- 访问：http://<服务器IP>:3100
- 反代后端：http://<服务器IP>:3101
- 配置来源：`backend/.env.prod` + `web/.env.prod`（不提交，强密钥）

## 环境变量说明

### 后端

| 变量 | 测试 | 生产 | 说明 |
|------|------|------|------|
| `NODE_ENV` | development | production | 控制 CORS/HTTPS 行为 |
| `DATABASE_URL` | `..._test` | `...正式库` | 指向不同数据库，隔离数据 |
| `JWT_ACCESS_SECRET` | 弱 | **强随机** | 两环境绝不共用 |
| `JWT_REFRESH_SECRET` | 弱 | **强随机** | 两环境绝不共用 |
| `CORS_ORIGIN` | 留空(全开) | 前端域名白名单 | 生产必须指定 |
| `FORCE_HTTPS` | false | true | 生产强制 HTTPS |

### 前端

| 变量 | 测试 | 生产 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | `http://<IP>:3001` | `http://<IP>:3101` |

> ⚠️ `NEXT_PUBLIC_API_URL` 在**构建时**内联进 JS，修改后必须重新 `build`（即重新 `up --build`）。

## 日常流程

1. 在 `test` 分支开发并 push → Actions 自动部署到测试环境。
2. 测试环境验证通过后，将 `test` 合并到 `main`。
3. push `main` → Actions 自动部署到生产环境。

## 生成强密钥

```bash
openssl rand -base64 48
```
