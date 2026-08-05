# ---- 构建阶段 ----
# 用 Debian 系 slim 镜像：Prisma 的 schema/query engine 依赖 libssl，
# Alpine 上易因 openssl 版本检测失败导致 migrate deploy 崩溃，bookworm-slim 自带可正常加载。
FROM node:22-bookworm-slim AS build
WORKDIR /app

# 原生 bcrypt 需要从源码编译，预装编译工具链
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ build-essential libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 先装依赖（利用层缓存）
COPY package*.json ./
RUN npm install

# 复制源码与 prisma schema，生成 client 并构建
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- 运行阶段 ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# 复制已安装依赖、构建产物、prisma schema
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# 运行时确保 Prisma Client 已生成（迁移也可在此执行）
RUN npx prisma generate

EXPOSE 3001
# 启动前先应用迁移（幂等），再启动服务；Railway 把 PORT 注入为运行时环境变量
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
