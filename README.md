# 智能任务板（Smart Task Board）

> 前端 → 全栈 Agent 工程师转型计划 · **阶段一：全栈奠基（任务板 1.0：能登录、能上线）**
> 一个应用从头长到尾：1.0 能登录上线 → 2.0 OAuth+实时 → 3.0 RAG+Agent。本仓库目前演进到阶段一。
>
> 📋 完整转型路线图见 [`docs/转型计划.html`](docs/转型计划.html)（4 阶段 8 个项目，本仓库按单应用「智能任务板」一路生长）。

## 目录结构

```
smart-task-board/
├─ backend/                 # 项目1：NestJS 后端（Prisma + Postgres + JWT 双令牌）
│  ├─ prisma/schema.prisma  # 用户表 / 任务表（userId 关联）
│  ├─ src/
│  │  ├─ auth/              # 注册 / 登录 / 刷新令牌
│  │  ├─ users/             # 个人资料
│  │  ├─ tasks/             # 任务增删改查（按 userId 隔离）
│  │  └─ common/            # 统一异常格式
│  ├─ test/                 # 端到端测试（需数据库）
│  └─ Dockerfile
├─ web/                     # 项目2：Next.js 前端（App Router + React Query + zod）
│  ├─ app/                  # 登录 / 注册 / 任务页
│  ├─ components/           # 任务表单、列表、鉴权表单
│  └─ lib/                  # API 层、鉴权 Context、React Query、校验 schema
├─ docker-compose.yml       # 本地：Postgres + 后端
├─ docs/转型计划.html        # 转型总路线图（阶段一~阶段四 / 项目1~项目8）
└─ .github/workflows/ci.yml # CI：构建 + 测试；部署说明见内注释
```

## 阶段一交付内容

| 项目 | 做什么 | 验收 |
|------|--------|------|
| 项目1 后端 | NestJS + Prisma + Postgres + JWT（access+refresh 双令牌），任务按用户隔离 | 注册→登录拿 token→增删改查自己的任务；用别人 token 改不了我的；刷新令牌能换新 access；单测跑绿 |
| 项目2 前端 | Next.js 网页任务板，React Query 管数据/登录态，zod 校验，Vercel 部署 | 浏览器登录/增删任务正常；刷新数据还在；表单错误有提示；组件测跑绿 |
| 项目3 部署 | Docker 容器化后端 + 数据库，GitHub Actions CI | 云上任务板可访问，数据重启不丢；能讲清「代码→镜像→上线」 |

## 本地开发

### 1. 起数据库 + 后端

```bash
# 根目录：起 Postgres + 后端容器
docker compose up --build

# 或本地裸跑后端：
cd backend
cp .env .env.local        # 已提供示例 .env
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev         # http://localhost:3001
```

### 2. 起前端

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev               # http://localhost:3000
```

### 3. 跑测试

```bash
cd backend && npm test                 # 单元测试（mock Prisma，无需 DB）
cd web && npm test                     # 组件测试 + 工具测试
```

## 部署（项目3 · 真上线）

> 目标：后端跑在 Railway（含 Postgres），前端跑在 Vercel，两端通过环境变量接通，任何人可访问。
> 仓库已就绪：后端 `Dockerfile` 在启动时自动 `prisma migrate deploy` 建表；前端在未设 `NEXT_PUBLIC_API_URL` 时走 `/api/backend` 反代，设了则直连后端。

### 后端 → Railway

1. 打开 [railway.app](https://railway.app) → 用 GitHub 登录 → `New Project` → `Deploy from GitHub repo` → 选本仓库。
2. 在 Project 里 **添加 PostgreSQL 插件**（`Database` → `PostgreSQL`）。插件会自动注入 `DATABASE_URL` 环境变量。
3. 进入后端服务 → `Settings` → `Source` 把 **Root Directory 设为 `backend`**（让 Railway 只构建 backend）。
4. 进入后端服务 → `Variables`，补充以下变量（不要提交真实密钥到仓库）：

   | 变量 | 值 | 说明 |
   |------|----|----|
   | `DATABASE_URL` | 由 Postgres 插件自动提供 | 无需手填 |
   | `JWT_ACCESS_SECRET` | 强随机字符串 | `openssl rand -hex 32` 生成 |
   | `JWT_REFRESH_SECRET` | 强随机字符串（与上面不同） | 同上 |
   | `JWT_ACCESS_EXPIRES_IN` | `15m` | |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` | |
   | `PORT` | 由 Railway 自动注入 | 应用已读 `process.env.PORT` |
   | `CORS_ORIGIN` | `https://你的前端.vercel.app` | 填 Vercel 分配的域名，逗号可分隔多个 |

5. 部署完成后，Railway 会给出一个后端域名（如 `xxx.up.railway.app`），记下它（下一步前端要用）。
6. 第一次启动，镜像里的 `prisma migrate deploy` 会自动建表，数据落在 Postgres 插件里，重启不丢。

### 前端 → Vercel

1. 打开 [vercel.com](https://vercel.com) → 用 GitHub 登录 → `Add New` → `Project` → 导入本仓库。
2. Framework 选 **Next.js**；**Root Directory 设为 `web`**（让 Vercel 只构建 web）。
3. 进入项目 → `Settings` → `Environment Variables`，添加：

   | 变量 | 值 |
   |------|----|
   | `NEXT_PUBLIC_API_URL` | `https://你的后端.up.railway.app`（Railway 上一步的域名，带 https） |

4. 保存并 `Deploy`。Vercel 构建时把 `NEXT_PUBLIC_API_URL` 编译进前端，浏览器直接调 Railway 后端。
5. 把 Vercel 分配的域名回填到 Railway 的 `CORS_ORIGIN`，否则浏览器跨域会被拦。

### 自托管 / 其他平台

- 任意支持 Docker 的平台可直接用本仓库 `docker-compose.yml`（`db` + `backend` 一起编排），或单独构建 `backend/Dockerfile`。
- CI 见 `.github/workflows/ci.yml`：push 到 main 自动构建并跑测试；显式部署 job 默认关闭，配置 `RAILWAY_TOKEN` / `VERCEL_TOKEN` 仓库 Secrets 后改为 `if: true` 即可在 Actions 里自动部署。

## 技术栈

TypeScript · NestJS · Prisma · PostgreSQL · JWT · Next.js · React Query · zod · Docker · Railway / Vercel

> 测试线说明：阶段一已为后端（auth/tasks 单测）与前端（组件测）建立测试基础；从阶段二起每个项目继续带测试。
