'use client';

import { TASK_STATUS_LABEL, type TaskStatus } from '@/lib/types';
import { formatDueDate, isOverdue } from '@/lib/date';

interface Props {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    dueDate: string | null;
  };
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (status: TaskStatus) => void;
  busy?: boolean;
}

export function TaskItem({ task, onEdit, onDelete, onToggleStatus, busy }: Props) {
  const overdue = task.status !== 'DONE' && isOverdue(task.dueDate);
  const nextStatus: TaskStatus =
    task.status === 'TODO' ? 'IN_PROGRESS' : task.status === 'IN_PROGRESS' ? 'DONE' : 'TODO';

  return (
    <li className={`task-item status-${task.status.toLowerCase()}`}>
      <div className="task-main">
        <span className="task-title">{task.title}</span>
        <span className="task-status">{TASK_STATUS_LABEL[task.status]}</span>
        {task.dueDate && (
          <span className={`task-due ${overdue ? 'overdue' : ''}`}>
            截止 {formatDueDate(task.dueDate)}
            {overdue && '（已逾期）'}
          </span>
        )}
      </div>
      {task.description && <p className="task-desc">{task.description}</p>}
      <div className="task-actions">
        <button onClick={() => onToggleStatus(nextStatus)} disabled={busy}>
          标记为{TASK_STATUS_LABEL[nextStatus]}
        </button>
        <button onClick={onEdit} disabled={busy}>
          编辑
        </button>
        <button onClick={onDelete} disabled={busy} className="danger">
          删除
        </button>
      </div>
    </li>
  );
}
