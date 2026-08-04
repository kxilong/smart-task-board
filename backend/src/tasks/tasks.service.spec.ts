import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';

// 只 mock Prisma 的 task 委托，验证「归属 / 存在」业务逻辑
const mockTaskDelegate = {
  create: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const prismaMock = { task: mockTaskDelegate } as unknown as PrismaService;

const ownerId = 'user-1';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  it('create 时把 userId 写进任务', async () => {
    const dto: CreateTaskDto = { title: '写代码' };
    mockTaskDelegate.create.mockResolvedValue({ id: 't1', ...dto, userId: ownerId });
    const result = await service.create(ownerId, dto);
    expect(mockTaskDelegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: ownerId, title: '写代码' }),
      }),
    );
    expect(result.userId).toBe(ownerId);
  });

  it('用别人的 token 查不到自己的任务 → 404', async () => {
    mockTaskDelegate.findFirst.mockResolvedValue(null);
    await expect(service.findOne(ownerId, 't-x')).rejects.toThrow(NotFoundException);
    expect(mockTaskDelegate.findFirst).toHaveBeenCalledWith({
      where: { id: 't-x', userId: ownerId },
    });
  });

  it('update 前先校验归属，归属不匹配直接 404', async () => {
    mockTaskDelegate.findFirst.mockResolvedValue(null);
    const dto: UpdateTaskDto = { status: TaskStatus.DONE };
    await expect(service.update(ownerId, 't-x', dto)).rejects.toThrow(NotFoundException);
    expect(mockTaskDelegate.update).not.toHaveBeenCalled();
  });

  it('update 归属匹配才执行更新', async () => {
    mockTaskDelegate.findFirst.mockResolvedValue({ id: 't1', userId: ownerId });
    const dto: UpdateTaskDto = { status: TaskStatus.DONE, title: '改标题' };
    mockTaskDelegate.update.mockResolvedValue({ id: 't1', ...dto, userId: ownerId });
    await service.update(ownerId, 't1', dto);
    expect(mockTaskDelegate.update).toHaveBeenCalled();
  });

  it('remove 归属匹配才删除', async () => {
    mockTaskDelegate.findFirst.mockResolvedValue({ id: 't1', userId: ownerId });
    mockTaskDelegate.delete.mockResolvedValue({ id: 't1' });
    await service.remove(ownerId, 't1');
    expect(mockTaskDelegate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });
});
