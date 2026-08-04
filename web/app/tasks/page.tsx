'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';
import { tasksApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Task, TaskStatus } from '@/lib/types';

export default function TasksPage() {
  const { isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login');
  }, [loading, isAuthenticated, router]);

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: tasksApi.list,
    enabled: isAuthenticated,
  });

  const createMut = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Task> }) =>
      tasksApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  if (loading || !isAuthenticated) {
    return <div className="card">加载中…</div>;
  }

  async function handleCreate(values: {
    title: string;
    description?: string;
    status?: TaskStatus;
    dueDate?: string;
  }) {
    await createMut.mutateAsync(values as any);
  }

  async function handleUpdate(values: {
    title: string;
    description?: string;
    status?: TaskStatus;
    dueDate?: string;
  }) {
    if (!editing) return;
    await updateMut.mutateAsync({ id: editing.id, input: values as any });
    setEditing(null);
  }

  async function handleToggle(task: Task, status: TaskStatus) {
    setBusyId(task.id);
    try {
      await updateMut.mutateAsync({ id: task.id, input: { status } });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`确定删除「${task.title}」？`)) return;
    setBusyId(task.id);
    try {
      await deleteMut.mutateAsync(task.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>我的任务</h2>
        <button className="btn-logout" onClick={logout}>
          退出登录
        </button>
      </div>

      <div className="card">
        <h3>{editing ? '编辑任务' : '新建任务'}</h3>
        <TaskForm
          initial={editing}
          submitting={createMut.isPending || updateMut.isPending}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={editing ? () => setEditing(null) : undefined}
        />
      </div>

      {error ? (
        <p className="form-error">加载任务失败：{(error as Error).message}</p>
      ) : isLoading ? (
        <p className="empty">加载中…</p>
      ) : (
        <TaskList
          tasks={tasks}
          busyId={busyId}
          onEdit={setEditing}
          onDelete={handleDelete}
          onToggleStatus={handleToggle}
        />
      )}
    </div>
  );
}
