# ---- 构建阶段 ----
FROM node:22-alpine AS build
WORKDIR /app

# 先装依赖（利用层缓存）
COPY package*.json ./
RUN npm install

# 复制源码与 prisma schema，生成 client 并构建
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- 运行阶段 ----
FROM node:22-alpine AS runtime
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
CMD ["node", "dist/main"]
