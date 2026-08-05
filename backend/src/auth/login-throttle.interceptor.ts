import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

// 登录失败限流：同一来源连续登录失败达到阈值后封锁一段时间。
// 仅依赖内存 Map，适用于单实例；多实例部署请改用 Redis 等共享存储。
const MAX_FAILURES = 5; // 允许的最大连续失败次数
const WINDOW_MS = 15 * 60 * 1000; // 计数滑动窗口：15 分钟
const BLOCK_MS = 15 * 60 * 1000; // 触发封锁后的冷却时间：15 分钟

interface ThrottleEntry {
  failures: number;
  firstFailAt: number;
  blockedUntil?: number;
}

@Injectable()
export class LoginThrottleInterceptor implements NestInterceptor {
  private readonly store = new Map<string, ThrottleEntry>();

  private keyOf(req: Request): string {
    const fwd = req.headers['x-forwarded-for'];
    const ip =
      Array.isArray(fwd)
        ? fwd[0]
        : typeof fwd === 'string'
          ? fwd.split(',')[0].trim()
          : req.ip;
    return `login:${ip ?? 'unknown'}`;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const key = this.keyOf(req);
    const now = Date.now();
    const entry = this.store.get(key);

    // 处于封锁期内 → 直接拒绝，并返回 Retry-After
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        '登录尝试过于频繁，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle().pipe(
      tap({
        next: () => {
          // 登录成功 → 清除该来源的失败计数
          this.store.delete(key);
        },
        error: (err) => {
          // 仅对“凭据错误”(401) 计数，避免把服务器异常也算作破解尝试
          if (err instanceof HttpException && err.getStatus() === HttpStatus.UNAUTHORIZED) {
            const cur =
              this.store.get(key) ?? { failures: 0, firstFailAt: now };
            if (now - cur.firstFailAt > WINDOW_MS) {
              cur.failures = 0;
              cur.firstFailAt = now;
            }
            cur.failures += 1;
            if (cur.failures >= MAX_FAILURES) {
              cur.blockedUntil = now + BLOCK_MS;
            }
            this.store.set(key, cur);
          }
        },
      }),
    );
  }
}
