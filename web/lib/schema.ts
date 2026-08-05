import { z } from 'zod';

// 与服务端 RegisterDto 保持一致：≥8 位且含大小写字母、数字、特殊符号
const passwordRule = z
  .string()
  .min(8, '密码至少 8 位')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/,
    '密码需同时包含大小写字母、数字和特殊符号',
  );

const usernameRule = z
  .string()
  .min(3, '用户名至少 3 位')
  .max(20, '用户名最多 20 位')
  .regex(/^[a-zA-Z0-9_-]+$/, '用户名仅允许字母、数字、下划线、连字符');

export const loginSchema = z.object({
  username: usernameRule,
  password: z.string().min(1, '请输入密码'),
});

export const registerSchema = z
  .object({
    username: usernameRule,
    password: passwordRule,
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
