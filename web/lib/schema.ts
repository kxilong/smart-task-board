import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
});

export const registerSchema = z
  .object({
    email: z.string().email('邮箱格式不正确'),
    password: z.string().min(6, '密码至少 6 位'),
    confirm: z.string(),
    name: z.string().max(50).optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.confirm, {
    message: '两次密码不一致',
    path: ['confirm'],
  });

export const taskSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 字'),
  description: z.string().max(2000, '描述最多 2000 字').optional().or(z.literal('')),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  dueDate: z.string().optional().or(z.literal('')),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
