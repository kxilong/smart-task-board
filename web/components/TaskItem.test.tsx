import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from './TaskItem';
import type { TaskStatus } from '@/lib/types';

const base = {
  id: 't1',
  title: '写单元测试',
  description: '用 RTL 验证组件',
  status: 'TODO' as TaskStatus,
  dueDate: null,
};

describe('<TaskItem />', () => {
  it('渲染标题、状态与描述', () => {
    render(
      <TaskItem task={base} onEdit={() => {}} onDelete={() => {}} onToggleStatus={() => {}} />,
    );
    expect(screen.getByText('写单元测试')).toBeInTheDocument();
    expect(screen.getByText('待办')).toBeInTheDocument();
    expect(screen.getByText('用 RTL 验证组件')).toBeInTheDocument();
  });

  it('点击「标记为进行中」回调带下一个状态', () => {
    const onToggle = jest.fn();
    render(
      <TaskItem task={base} onEdit={() => {}} onDelete={() => {}} onToggleStatus={onToggle} />,
    );
    fireEvent.click(screen.getByText('标记为进行中'));
    expect(onToggle).toHaveBeenCalledWith('IN_PROGRESS');
  });

  it('逾期任务显示「已逾期」', () => {
    const overdue = {
      ...base,
      dueDate: new Date(Date.now() - 86_400_000).toISOString(),
    };
    render(
      <TaskItem task={overdue} onEdit={() => {}} onDelete={() => {}} onToggleStatus={() => {}} />,
    );
    expect(screen.getByText(/已逾期/)).toBeInTheDocument();
  });
});
