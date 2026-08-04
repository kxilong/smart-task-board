/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 本地/预览面板中，前端走同域 /api/backend/*，由 Next.js 服务端反代到后端。
  // 生产部署时，设置 NEXT_PUBLIC_API_URL 为后端域名，前端直连后端。
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    return [{ source: '/api/backend/:path*', destination: `${api}/:path*` }];
  },
};

export default nextConfig;
