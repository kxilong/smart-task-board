# 双环境部署（测试 / 生产，同一台服务器）

本项目使用 Docker Compose 在同一台服务器上并行运行两个隔离环境：

| 项目 | 分支 | 前端端口 | 后端端口 | 数据库端口 | 数据库名 |
|------|------|---------|---------|-----------|---------|
| 测试 | `test` | `3000` | `3001` | `5432` | `smart_task_board_test` |
| 生产 | `main` | `3100` | `3101` | `5433`(仅内部) | `smart_task_board` |

两个环境使用**完全独立的容器、端口、数据库**，互不干扰。
宿主机端口错开，但容器内端口一致（3001/5432/3000），由 Docker 网络隔离。

## 自动化部署（GitHub Actions）

已配置 `.github/workflows/deploy.yml`：

- push 到 `test` 分支 → 自动 SSH 到服务器，在 `/opt/stb/test` 拉代码并 `docker compose up -d --build`（测试环境）
- push 到 `main` 分支 → 自动 SSH 到服务器，在 `/opt/stb/prod` 拉代码并 `docker compose -f docker-compose.prod.yml up -d --build`（生产环境）

### 仓库 Secrets（Settings → Secrets and variables → Actions）

| Secret | 值 |
|--------|-----|
| `SERVER_HOST` | `124.223.192.177` |
| `SERVER_USER` | 服务器 SSH 用户名 |
| `SSH_PRIVATE_KEY` | 可登录服务器的私钥（公钥需已在服务器 `~/.ssh/authorized_keys`） |

### 服务器一次性初始准备

```bash
# 1. 安装 Docker + compose plugin（略）

# 2. 创建测试目录并 checkout test 分支
mkdir -p /opt/stb && cd /opt/stb
git clone <仓库地址> test && cd test && git checkout test

# 3. 创建生产目录并 checkout main 分支
cd /opt/stb
git clone <仓库地址> prod && cd prod && git checkout main

# 4. 生产环境需手动放置 .env.prod（不进 git，含强随机密钥）
cd /opt/stb/prod
cat > backend/.env.prod <<'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@db:5432/smart_task_board?schema=public
JWT_ACCESS_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
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

- 测试代码 checkout 到 `test` 分支，运行 `docker-compose.yml`
- 生产代码 checkout 到 `main` 分支，运行 `docker-compose.prod.yml`

建议两台独立目录（各 checkout 对应分支）：

```
/opt/stb-test/     # git checkout test
/opt/stb-prod/     # git checkout main
```

## 测试环境

```bash
cd /opt/stb-test
docker compose up -d --build
```

- 访问：http://<服务器IP>:3000
- 反代后端：http://<服务器IP>:3001
- 配置来源：`backend/.env.test` + `web/.env.test`（已提交，弱密钥）

## 生产环境

生产配置 `backend/.env.prod` / `web/.env.prod` **不提交 git**，需手动放置到服务器并填入强密钥。

```bash
cd /opt/stb-prod
# 确保 backend/.env.prod 与 web/.env.prod 已存在（含强随机 JWT 密钥）
docker compose -f docker-compose.prod.yml up -d --build
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

1. 在 `test` 分支开发 → 部署到测试环境验证
2. 合并 `test` → `main`
3. 生产目录 `git pull` + `docker compose -f docker-compose.prod.yml up -d --build`

## 生成强密钥

```bash
openssl rand -base64 48
```
