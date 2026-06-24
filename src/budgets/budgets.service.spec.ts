import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { BudgetPeriodType } from '@prisma/client';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    budget: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a budget', async () => {
      const dto = { categoryId: 'c1', amountLimit: 500, periodType: BudgetPeriodType.monthly, name: 'Groceries', startDate: '2023-01-01' };
      mockPrismaService.budget.create.mockResolvedValue({ id: 'b1', ...dto });

      const result = await service.create('h1', dto);
      expect(mockPrismaService.budget.create).toHaveBeenCalled();
      expect(result.id).toBe('b1');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if budget not found', async () => {
      mockPrismaService.budget.findFirst.mockResolvedValue(null);
      await expect(service.findOne('h1', 'b2')).rejects.toThrow(NotFoundException);
    });
  });
});
