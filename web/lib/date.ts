/** 把 ISO 字符串格式化成 YYYY-MM-DD；非法返回空串 */
export function formatDueDate(due?: string | null): string {
  if (!due) return '';
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 截止日期是否已过（相对于 now）且未完成由调用方判断 */
export function isOverdue(due?: string | null, now: Date = new Date()): boolean {
  if (!due) return false;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}
