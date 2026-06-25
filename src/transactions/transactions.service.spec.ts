import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation((callback) => callback(mockPrismaService)),
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transactionSplit: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction without splits', async () => {
      const dto = { categoryId: 'cat1', amount: 100, transactionDate: '2023-01-01', type: TransactionType.expense };
      mockPrismaService.transaction.create.mockResolvedValue({ id: 't1', ...dto });

      const result = await service.create('h1', 'u1', dto as any);

      expect(mockPrismaService.transaction.create).toHaveBeenCalled();
      expect(result.id).toBe('t1');
    });
  });

  describe('findOne', () => {
    it('should return a transaction if found', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({ id: 't1' });
      const result = await service.findOne('h1', 't1');
      expect(result.id).toBe('t1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue(null);
      await expect(service.findOne('h1', 't2')).rejects.toThrow(NotFoundException);
    });
  });
});
