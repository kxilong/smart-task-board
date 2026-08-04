'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace('/tasks');
  }, [loading, isAuthenticated, router]);

  return (
    <div className="card">
      <h2>登录</h2>
      <AuthForm mode="login" onSubmit={login} />
      <p className="center-link">
        还没有账号？<Link href="/register">去注册</Link>
      </p>
    </div>
  );
}
