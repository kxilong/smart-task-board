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
const isProd = process.env.NODE_ENV === 'production';

// 默认值：生产环境 10 次/5 分钟，开发环境 20 次/10 分钟，避免本地调试误锁。
// 均可通过环境变量覆盖。
const MAX_FAILURES = Number(process.env.LOGIN_THROTTLE_MAX_FAILURES) ||
  (isProd ? 10 : 20);
const WINDOW_MS = Number(process.env.LOGIN_THROTTLE_WINDOW_MS) ||
  (isProd ? 5 * 60 * 1000 : 10 * 60 * 1000);
const BLOCK_MS = Number(process.env.LOGIN_THROTTLE_BLOCK_MS) ||
  (isProd ? 10 * 60 * 1000 : 5 * 60 * 1000);

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
      const retryAfterSec = Math.ceil((entry.blockedUntil - now) / 1000);
      const retryAfterMin = Math.ceil(retryAfterSec / 60);
      res.setHeader('Retry-After', String(retryAfterSec));
      throw new HttpException(
        `登录尝试过于频繁，请 ${retryAfterMin} 分钟后再试`,
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
