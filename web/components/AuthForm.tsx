'use client';

import { useState, type FormEvent } from 'react';
import { loginSchema, registerSchema } from '@/lib/schema';

interface Props {
  mode: 'login' | 'register';
  onSubmit: (values: { email: string; password: string; name?: string }) => Promise<void>;
}

export function AuthForm({ mode, onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError('');
    setErrors({});

    const values =
      mode === 'login'
        ? loginSchema.safeParse({ email, password })
        : registerSchema.safeParse({ email, password, confirm, name });
    if (!values.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of values.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onSubmit({ email, password });
      } else {
        await onSubmit({ email, password, name: name || undefined });
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form" noValidate>
      <label>
        邮箱
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      {errors.email && <p className="field-error">{errors.email}</p>}

      <label>
        密码
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </label>
      {errors.password && <p className="field-error">{errors.password}</p>}
      {mode === 'register' && (
        <p style={{ fontSize: 12, color: '#888', marginTop: -6, marginBottom: 8 }}>
          至少 8 位，需含大小写字母、数字和特殊符号
        </p>
      )}

      {mode === 'register' && (
        <>
          <label>
            确认密码
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {errors.confirm && <p className="field-error">{errors.confirm}</p>}

          <label>
            昵称（可选）
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </>
      )}

      {serverError && <p className="form-error">{serverError}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? '处理中…' : mode === 'login' ? '登录' : '注册'}
      </button>
    </form>
  );
}
