import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const dto = { userId: 'u1', type: NotificationType.system, title: 'Hello', body: 'Test' };
      mockPrismaService.notification.create.mockResolvedValue({ id: 'n1', ...dto });

      const result = await service.create(dto);
      expect(mockPrismaService.notification.create).toHaveBeenCalled();
      expect(result.id).toBe('n1');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);
      await expect(service.update('n2', { isRead: true })).rejects.toThrow(NotFoundException);
    });
  });
});
