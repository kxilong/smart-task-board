import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { QueryProvider } from '@/lib/query';

export const metadata: Metadata = {
  title: '智能任务板',
  description: '前端 → 全栈 Agent 工程师转型 · 阶段一任务板',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <QueryProvider>
            <header className="site-header">
              <span className="logo">📋 智能任务板</span>
            </header>
            <main className="container">{children}</main>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
