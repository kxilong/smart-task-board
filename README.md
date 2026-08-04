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

## 部署（项目3）

- **后端 → Railway**：Railway 连本仓库、指定 `backend/` 为 Root、加 Postgres 插件；把 `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` 设为平台环境变量。Railway 的 Git 集成实现「推送即上线」。
- **前端 → Vercel**：导入 `web/` 目录，环境变量 `NEXT_PUBLIC_API_URL` 填 Railway 后端域名（带 https）。
- 也可用本仓库 `docker-compose.yml` 在任意支持 Docker 的平台自托管整套服务。
- CI 见 `.github/workflows/ci.yml`：push 到 main 自动构建并跑测试；显式部署 job 默认关闭，配置 `RAILWAY_TOKEN` / `VERCEL_TOKEN` 后启用。

## 技术栈

TypeScript · NestJS · Prisma · PostgreSQL · JWT · Next.js · React Query · zod · Docker · Railway / Vercel

> 测试线说明：阶段一已为后端（auth/tasks 单测）与前端（组件测）建立测试基础；从阶段二起每个项目继续带测试。
