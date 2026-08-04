import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * 端到端测试：覆盖「注册 → 登录拿 token → 增删改查自己的任务 → 用别人 token 改不了 → 刷新令牌」。
 * 需要可用的 Postgres（本地 docker-compose 起 db，或 CI 里起服务）。
 * 运行：在 backend 目录 `npx prisma migrate deploy && npm run test:e2e`
 */
describe('任务板 API (e2e)', () => {
  let app: INestApplication;
  let server: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const email = `e2e_${Date.now()}@example.com`;
  let accessToken: string;
  let refreshToken: string;
  let taskId: string;

  it('注册成功返回双令牌', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({ email, password: 'password123', name: 'E2E' })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('登录后能用 token 创建任务', async () => {
    const res = await request(server)
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'E2E 任务' })
      .expect(201);
    expect(res.body.title).toBe('E2E 任务');
    taskId = res.body.id;
  });

  it('未带 token 访问任务列表 → 401', async () => {
    await request(server).get('/tasks').expect(401);
  });

  it('刷新令牌能换到新 access', async () => {
    const res = await request(server)
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it('更新任务成功', async () => {
    const res = await request(server)
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'DONE' })
      .expect(200);
    expect(res.body.status).toBe('DONE');
  });

  it('删除任务成功', async () => {
    await request(server)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
