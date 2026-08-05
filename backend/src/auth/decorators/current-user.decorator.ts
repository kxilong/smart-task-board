import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 取出 passport 注入的 req.user（由 JwtStrategy.validate 返回）。
 * 用法：@CurrentUser() user: { userId: string; username: string }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
