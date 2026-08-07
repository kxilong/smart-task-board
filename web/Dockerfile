# 前端 Dockerfile（Next.js standalone 模式）
# 测试/生产共用此文件，差异由 NEXT_PUBLIC_API_URL 注入。

# ---- 依赖安装阶段 ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# ---- 构建阶段 ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* 在构建时内联，必须通过 build arg 注入
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ---- 运行阶段 ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# standalone 模式需要从源码复制 public（构建产物里不包含）
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
