'use client';

import { useState, type FormEvent } from 'react';
import { taskSchema } from '@/lib/schema';
import type { Task, TaskStatus } from '@/lib/types';

interface Props {
  initial?: Task | null;
  onSubmit: (values: {
    title: string;
    description?: string;
    status?: TaskStatus;
    dueDate?: string;
  }) => Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
}

export function TaskForm({ initial, onSubmit, onCancel, submitting }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'TODO');
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');
    const parsed = taskSchema.safeParse({ title, description, status, dueDate });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!fe[key]) fe[key] = issue.message;
      }
      setErrors(fe);
      return;
    }
    try {
      await onSubmit({
        title,
        description: description || undefined,
        status,
        dueDate: dueDate || undefined,
      });
      if (!initial) {
        setTitle('');
        setDescription('');
        setStatus('TODO');
        setDueDate('');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : '保存失败');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form" noValidate>
      <label>
        标题
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      {errors.title && <p className="field-error">{errors.title}</p>}

      <label>
        描述
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {errors.description && <p className="field-error">{errors.description}</p>}

      <div className="row">
        <label>
          状态
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            <option value="TODO">待办</option>
            <option value="IN_PROGRESS">进行中</option>
            <option value="DONE">已完成</option>
          </select>
        </label>
        <label>
          截止日期
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </div>

      {serverError && <p className="form-error">{serverError}</p>}

      <div className="row">
        <button type="submit" disabled={submitting}>
          {submitting ? '保存中…' : initial ? '保存修改' : '新建任务'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="ghost">
            取消
          </button>
        )}
      </div>
    </form>
  );
}
