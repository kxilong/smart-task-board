'use client';

import { TaskItem } from './TaskItem';
import type { Task, TaskStatus } from '@/lib/types';

interface Props {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleStatus: (task: Task, status: TaskStatus) => void;
  busyId?: string | null;
}

export function TaskList({ tasks, onEdit, onDelete, onToggleStatus, busyId }: Props) {
  if (tasks.length === 0) {
    return <p className="empty">还没有任务，新建一个吧。</p>;
  }
  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onEdit={() => onEdit(task)}
          onDelete={() => onDelete(task)}
          onToggleStatus={(status) => onToggleStatus(task, status)}
          busy={busyId === task.id}
        />
      ))}
    </ul>
  );
}
