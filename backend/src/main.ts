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

  // 统一异常格式：避免把堆栈泄露给前端，返回 { statusCode, message, error }
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS：阶段一先放开，便于本地 Vercel 前端联调；生产应改为指定域名白名单
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').filter(Boolean) ?? true,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 智能任务板后端已启动: http://localhost:${port}`);
}

bootstrap();
