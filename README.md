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
│  │  ├─ health/            # 部署健康检查（含数据库连通性）
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
└─ .github/workflows/        # CI 与双环境自动部署
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

当前部署采用 GitHub Actions + Gitee 镜像 + SSH + Docker Compose：

- push 到 `test` 分支 → 自动部署测试环境，前端 `3000`，后端 `3001`。
- push 到 `main` 分支 → 自动部署生产环境，前端 `3100`，后端 `3101`。
- 部署前会先跑后端构建与单测、前端 lint、单测与生产构建。
- 服务器从 Gitee 下载精确 commit tarball，不依赖服务器访问 GitHub。
- 生产环境的 `backend/.env.prod` 与 `web/.env.prod` 只放在服务器，不提交 git。

完整部署说明见 [`docs/deploy-environments.md`](docs/deploy-environments.md)。

## 技术栈

TypeScript · NestJS · Prisma · PostgreSQL · JWT · Next.js · React Query · zod · Docker · GitHub Actions

> 测试线说明：阶段一已为后端（auth/tasks 单测）与前端（组件测）建立测试基础；从阶段二起每个项目继续带测试。
