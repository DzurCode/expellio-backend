import { Test, TestingModule } from '@nestjs/testing';
import { SavingsGoalsService } from './savings-goals.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { SavingsGoalStatus } from '@prisma/client';

describe('SavingsGoalsService', () => {
  let service: SavingsGoalsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    savingsGoal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavingsGoalsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SavingsGoalsService>(SavingsGoalsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a savings goal', async () => {
      const dto = { name: 'Vacation', targetAmount: 5000 };
      mockPrismaService.savingsGoal.create.mockResolvedValue({ id: 's1', ...dto });

      const result = await service.create('h1', dto);
      expect(mockPrismaService.savingsGoal.create).toHaveBeenCalled();
      expect(result.id).toBe('s1');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.savingsGoal.findFirst.mockResolvedValue(null);
      await expect(service.update('h1', 's2', { targetAmount: 200 })).rejects.toThrow(NotFoundException);
    });
  });
});
