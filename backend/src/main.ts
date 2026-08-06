import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局校验管道：class-validator + class-transformer，自动拒绝非法入参
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 信任反向代理（Vercel / Railway / Nginx）转发的 IP 与协议，
  // 否则 req.ip 与 x-forwarded-proto 不可信，限流与 HTTPS 判断会失效。
  const expressInstance = app
    .getHttpAdapter()
    .getInstance() as unknown as import('express').Express;
  expressInstance.set('trust proxy', true);

  // 生产环境：非 HTTPS 请求一律 301 跳转到 HTTPS，并下发 HSTS，
  // 确保密码等敏感数据永不通过明文传输。
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
      next();
    });
  }

  // 统一异常格式：避免把堆栈泄露给前端，返回 { statusCode, message, error }
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS：阶段一先放开，便于本地 Vercel 前端联调；生产应改为指定域名白名单
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').filter(Boolean) ?? true,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🚀 智能任务板后端已启动: http://localhost:${port}`);
}

bootstrap();
