import { Test, TestingModule } from '@nestjs/testing';
import { RecurringConfigsService } from './recurring-configs.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { TransactionType, RecurringFrequency } from '@prisma/client';

describe('RecurringConfigsService', () => {
  let service: RecurringConfigsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation((callback) => callback(mockPrismaService)),
    recurringConfig: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringConfigsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RecurringConfigsService>(RecurringConfigsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('should update config and cascade to future transactions', async () => {
      mockPrismaService.recurringConfig.findFirst.mockResolvedValue({ id: 'r1' });
      mockPrismaService.recurringConfig.update.mockResolvedValue({ id: 'r1', amount: 200 });

      await service.update('h1', 'r1', { amount: 200 });

      expect(mockPrismaService.transaction.updateMany).toHaveBeenCalledWith({
        where: {
          recurringConfigId: 'r1',
          transactionDate: expect.objectContaining({ gt: expect.any(Date) }),
          deletedAt: null,
        },
        data: { amount: 200 },
      });
    });
  });
});
