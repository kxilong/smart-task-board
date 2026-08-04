import { formatDueDate, isOverdue } from '@/lib/date';

describe('date 工具', () => {
  it('formatDueDate 把 ISO 格式化为 YYYY-MM-DD', () => {
    expect(formatDueDate('2026-01-02T00:00:00.000Z')).toBe('2026-01-02');
  });

  it('空值返回空串', () => {
    expect(formatDueDate(null)).toBe('');
    expect(formatDueDate(undefined)).toBe('');
    expect(formatDueDate('not-a-date')).toBe('');
  });

  it('isOverdue 对过去日期返回 true，未来返回 false', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(isOverdue(past)).toBe(true);
    expect(isOverdue(future)).toBe(false);
    expect(isOverdue(null)).toBe(false);
  });
});
