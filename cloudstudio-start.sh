#!/usr/bin/env bash
# CloudStudio 一键启动脚本（裸跑，不依赖 Docker）
# 适用：CloudStudio Ubuntu 工作区，已装 Node 18+ 与 postgresql
# 用法：在仓库根目录执行  bash cloudstudio-start.sh
set -e

echo "==> [1/5] 安装系统依赖（postgres + curl），若已装会自动跳过"
if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
fi
sudo service postgresql start || true

echo "==> [2/5] 创建数据库 smart_task_board（若不存在）"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='smart_task_board'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE smart_task_board;"

export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_task_board?schema=public"
export JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-cs-access-secret-change-me}"
export JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-cs-refresh-secret-change-me}"
export JWT_ACCESS_EXPIRES_IN=15m
export JWT_REFRESH_EXPIRES_IN=7d
export PORT=3001
export CORS_ORIGIN=http://localhost:3000

echo "==> [3/5] 安装后端依赖 + Prisma 迁移"
cd "$(dirname "$0")/backend"
npm install
npx prisma generate
npx prisma migrate deploy
(npm run start:prod > /tmp/cs-backend.log 2>&1 &)
echo "    后端已在后台启动 (端口 3001)"
sleep 3

echo "==> [4/5] 安装前端依赖 + 构建"
cd "$(dirname "$0")/web"
# 留空 NEXT_PUBLIC_API_URL → 走 Next.js 反代 /api/backend → 后端 3001
echo "NEXT_PUBLIC_API_URL=" > .env.local
npm install
npm run build
(npm run start -p 3000 > /tmp/cs-web.log 2>&1 &)
echo "    前端已在后台启动 (端口 3000)"

echo "==> [5/5] 完成"
echo "----------------------------------------"
echo " 前端: http://localhost:3000  (CloudStudio 预览端口)"
echo " 后端: http://localhost:3001  (仅工作区内可访问)"
echo " 数据库: postgresql://postgres:postgres@localhost:5432/smart_task_board"
echo " 前端通过 /api/backend 反代访问后端，无需暴露 3001"
echo "----------------------------------------"
echo "查看日志: tail -f /tmp/cs-backend.log /tmp/cs-web.log"
