'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace('/tasks');
  }, [loading, isAuthenticated, router]);

  return (
    <div className="card">
      <h2>注册</h2>
      <AuthForm mode="register" onSubmit={register} />
      <p className="center-link">
        已有账号？<Link href="/login">去登录</Link>
      </p>
    </div>
  );
}
