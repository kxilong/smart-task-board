import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const userDelegate = {
  findUnique: jest.fn(),
  create: jest.fn(),
};

const prismaMock = { user: userDelegate } as unknown as PrismaService;

const jwtMock = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const configMock = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return map[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('register 邮箱已存在 → 409', async () => {
    userDelegate.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    await expect(
      service.register({ email: 'a@b.com', password: 'secret1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('register 成功返回双令牌', async () => {
    userDelegate.findUnique.mockResolvedValue(null);
    userDelegate.create.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      name: null,
      createdAt: new Date(),
    });
    jwtMock.signAsync.mockResolvedValue('signed-token');
    const res = await service.register({ email: 'a@b.com', password: 'secret1' });
    expect(res.accessToken).toBe('signed-token');
    expect(res.refreshToken).toBe('signed-token');
    expect(res.user.email).toBe('a@b.com');
  });

  it('login 邮箱或密码错误 → 401', async () => {
    userDelegate.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refresh 令牌无效 → 401', async () => {
    jwtMock.verifyAsync.mockRejectedValue(new Error('invalid'));
    await expect(service.refreshTokens({ refreshToken: 'bad' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refresh 成功签发新双令牌', async () => {
    jwtMock.verifyAsync.mockResolvedValue({ sub: 'u1', email: 'a@b.com' });
    userDelegate.findUnique.mockResolvedValue({ id: 'u1' });
    jwtMock.signAsync.mockResolvedValue('new-token');
    const res = await service.refreshTokens({ refreshToken: 'good' });
    expect(res.accessToken).toBe('new-token');
    expect(res.refreshToken).toBe('new-token');
  });
});
