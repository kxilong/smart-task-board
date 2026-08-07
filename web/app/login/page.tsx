'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/lib/auth';

const environment = (() => {
  switch (process.env.NEXT_PUBLIC_APP_ENV) {
    case 'production':
      return { label: '正式环境', kind: 'production' };
    case 'test':
      return { label: '测试环境', kind: 'test' };
    default:
      return { label: '本地环境', kind: 'local' };
  }
})();

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace('/tasks');
  }, [loading, isAuthenticated, router]);

  return (
    <div className="card">
      <div className={'login-heading'}>
        <h2>登录</h2>
        <span className={'environment-tag environment-tag--' + environment.kind}>
          {environment.label}
        </span>
      </div>
      <AuthForm mode="login" onSubmit={login} />
      <p className="center-link">
        还没有账号？<Link href="/register">去注册</Link>
      </p>
    </div>
  );
}
