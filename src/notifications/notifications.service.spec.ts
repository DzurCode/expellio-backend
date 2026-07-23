import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification (internal use)', async () => {
      const dto = {
        userId: 'u1',
        type: NotificationType.system,
        title: 'Hello',
        body: 'Test',
      };
      mockPrismaService.notification.create.mockResolvedValue({ id: 'n1', ...dto });

      const result = await service.create(dto as any);
      expect(mockPrismaService.notification.create).toHaveBeenCalled();
      expect(result?.id).toBe('n1');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when notification does not belong to user', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);
      await expect(service.findOne('n1', 'wrong-user')).rejects.toThrow(NotFoundException);
    });

    it('should return notification when userId matches', async () => {
      const notif = { id: 'n1', userId: 'u1' };
      mockPrismaService.notification.findFirst.mockResolvedValue(notif);
      const result = await service.findOne('n1', 'u1');
      expect(result).toEqual(notif);
    });
  });

  describe('deleteAll', () => {
    it('should soft-delete all notifications for the user', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });
      const result = await service.deleteAll('u1');
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'u1' }) }),
      );
      expect(result).toEqual({ count: 3 });
    });
  });
});

