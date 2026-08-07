# ---- 构建阶段 ----
# 用完整版 node:22-bookworm（自带 gcc/python 编译链）避免 apt 安装，
# 因为服务器无法访问 Debian 镜像源。Prisma 依赖 libssl 在 bookworm 自带。
FROM node:22-bookworm AS build
WORKDIR /app

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

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

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
