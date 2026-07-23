import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { TransactionType, Prisma } from '@prisma/client';

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
      groupBy: jest.fn().mockResolvedValue([
        { type: 'income', _sum: { amount: 100 } },
        { type: 'expense', _sum: { amount: 50 } }
      ]),
    },
    transactionSplit: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    goalContribution: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    user: {
      findUnique: jest.fn(),
    },
    userAchievement: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    budget: {
      findFirst: jest.fn(),
    },
    budgetAlert: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    householdMember: {
      findMany: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
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

    it('should create a transaction with splits', async () => {
      const dto = { 
        categoryId: 'cat1', 
        amount: 100, 
        transactionDate: '2023-01-01', 
        type: TransactionType.expense,
        splits: [{ amount: 50, userId: 'u1' }, { amount: 50, userId: 'u2' }] 
      };
      mockPrismaService.transaction.create.mockResolvedValue({ id: 't1', ...dto });

      const result = await service.create('h1', 'u1', dto as any);

      expect(mockPrismaService.transactionSplit.createMany).toHaveBeenCalled();
      expect(result.id).toBe('t1');
    });

    it('should throw ConflictException on Prisma P2002 error', async () => {
      mockPrismaService.transaction.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2002', clientVersion: 'x' })
      );
      await expect(service.create('h1', 'u1', {} as any)).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockPrismaService.transaction.create.mockRejectedValue(new Error('DB Error'));
      await expect(service.create('h1', 'u1', {} as any)).rejects.toThrow(InternalServerErrorException);
    });

    it('should check budget alerts and create notifications if threshold exceeded', async () => {
      const dto = { categoryId: 'cat1', amount: 100, transactionDate: '2023-01-01', type: TransactionType.expense };
      mockPrismaService.transaction.create.mockResolvedValue({ id: 't1', ...dto, householdId: 'h1' });
      
      mockPrismaService.budget.findFirst.mockResolvedValue({ 
        id: 'b1', amountLimit: 100, startDate: new Date('2023-01-01'), periodType: 'monthly' 
      });
      mockPrismaService.transaction.findMany.mockResolvedValue([{ amount: 100 }]);
      mockPrismaService.budgetAlert.findFirst.mockResolvedValue(null);
      mockPrismaService.householdMember.findMany.mockResolvedValue([{ userId: 'u2' }]);
      mockPrismaService.category.findUnique.mockResolvedValue({ name: 'Food', icon: '🍔' });

      await service.create('h1', 'u1', dto as any);

      expect(mockPrismaService.budgetAlert.create).toHaveBeenCalled();
      expect(mockPrismaService.notification.create).toHaveBeenCalled();
    });

    it('should check budget alerts and handle 80% threshold and weekly period', async () => {
      const dto = { categoryId: 'cat1', amount: 80, transactionDate: '2023-01-01', type: TransactionType.expense };
      mockPrismaService.transaction.create.mockResolvedValue({ id: 't2', ...dto, householdId: 'h1' });
      
      mockPrismaService.budget.findFirst.mockResolvedValue({ 
        id: 'b1', amountLimit: 100, startDate: new Date('2023-01-01'), periodType: 'weekly' 
      });
      mockPrismaService.transaction.findMany.mockResolvedValue([{ amount: 80 }]);
      mockPrismaService.budgetAlert.findFirst.mockResolvedValue(null);
      
      await service.create('h1', 'u1', dto as any);

      expect(mockPrismaService.budgetAlert.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ thresholdPctReached: 80 })
      }));
    });

    it('should check budget alerts and handle biweekly period', async () => {
      const dto = { categoryId: 'cat1', amount: 100, transactionDate: '2023-01-01', type: TransactionType.expense };
      mockPrismaService.transaction.create.mockResolvedValue({ id: 't3', ...dto, householdId: 'h1' });
      
      // Test biweekly period logic for both before and after start date.
      // Easiest is to set budget startDate in future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      mockPrismaService.budget.findFirst.mockResolvedValue({ 
        id: 'b1', amountLimit: 100, startDate: futureDate, periodType: 'biweekly' 
      });
      mockPrismaService.transaction.findMany.mockResolvedValue([{ amount: 100 }]);
      mockPrismaService.budgetAlert.findFirst.mockResolvedValue(null);
      
      await service.create('h1', 'u1', dto as any);

      expect(mockPrismaService.budgetAlert.create).toHaveBeenCalled();
    });
    
    it('should check budget alerts and handle yearly period', async () => {
      const dto = { categoryId: 'cat1', amount: 100, transactionDate: '2023-01-01', type: TransactionType.expense };
      mockPrismaService.transaction.create.mockResolvedValue({ id: 't4', ...dto, householdId: 'h1' });
      
      mockPrismaService.budget.findFirst.mockResolvedValue({ 
        id: 'b1', amountLimit: 100, startDate: new Date(), periodType: 'yearly' 
      });
      mockPrismaService.transaction.findMany.mockResolvedValue([{ amount: 100 }]);
      mockPrismaService.budgetAlert.findFirst.mockResolvedValue(null);
      
      await service.create('h1', 'u1', dto as any);

      expect(mockPrismaService.budgetAlert.create).toHaveBeenCalled();
    });

    it('should catch and log error if checkBudgetAlerts fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const dto = { categoryId: 'cat1', amount: 100, transactionDate: '2023-01-01', type: TransactionType.expense };
      mockPrismaService.transaction.create.mockResolvedValue({ id: 't4', ...dto, householdId: 'h1' });
      
      mockPrismaService.budget.findFirst.mockRejectedValue(new Error('Budget DB Error'));

      await service.create('h1', 'u1', dto as any);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to check budget alerts:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('findAll', () => {
    it('should return an array of transactions', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([{ id: 't1' }]);
      const result = await service.findAll('h1');
      expect(result).toEqual([{ id: 't1' }]);
    });

    it('should throw InternalServerErrorException on unexpected database error', async () => {
      mockPrismaService.transaction.findMany.mockRejectedValue(new Error('DB Error'));
      await expect(service.findAll('h1')).rejects.toThrow(InternalServerErrorException);
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

    it('should throw InternalServerErrorException on unexpected database error', async () => {
      mockPrismaService.transaction.findFirst.mockRejectedValue(new Error('DB Error'));
      await expect(service.findOne('h1', 't3')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('update', () => {
    it('should update a transaction without splits', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({ id: 't1' });
      mockPrismaService.transaction.update.mockResolvedValue({ id: 't1', amount: 200 });

      const dto = { amount: 200 };
      const result = await service.update('h1', 't1', dto as any);

      expect(mockPrismaService.transaction.update).toHaveBeenCalled();
      expect(result.amount).toBe(200);
    });

    it('should update a transaction with splits', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({ id: 't1' });
      mockPrismaService.transaction.update.mockResolvedValue({ id: 't1', amount: 200 });

      const dto = { 
        amount: 200, 
        transactionDate: '2023-01-01',
        splits: [{ amount: 100, userId: 'u1' }, { amount: 100, userId: 'u2' }] 
      };
      await service.update('h1', 't1', dto as any);

      expect(mockPrismaService.transactionSplit.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.transactionSplit.createMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if not found during update', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue(null);
      await expect(service.update('h1', 't2', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException on Prisma P2025 error', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({ id: 't1' });
      mockPrismaService.transaction.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', { code: 'P2025', clientVersion: 'x' })
      );
      await expect(service.update('h1', 't1', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on Prisma P2002 error', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({ id: 't1' });
      mockPrismaService.transaction.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2002', clientVersion: 'x' })
      );
      await expect(service.update('h1', 't1', {} as any)).rejects.toThrow(ConflictException);
    });

    it('should throw InternalServerErrorException on unexpected error during update', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({ id: 't1' });
      mockPrismaService.transaction.update.mockRejectedValue(new Error('DB Error'));
      await expect(service.update('h1', 't1', {} as any)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('should mark a transaction as deleted', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({ id: 't1' });
      mockPrismaService.transaction.update.mockResolvedValue({ id: 't1', deletedAt: new Date() });

      const result = await service.remove('h1', 't1');
      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.deletedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if not found during remove', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue(null);
      await expect(service.remove('h1', 't2')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException on Prisma P2025 error during remove', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({ id: 't1' });
      mockPrismaService.transaction.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('not found', { code: 'P2025', clientVersion: 'x' })
      );
      await expect(service.remove('h1', 't1')).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on unexpected error during remove', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({ id: 't1' });
      mockPrismaService.transaction.update.mockRejectedValue(new Error('DB Error'));
      await expect(service.remove('h1', 't1')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getSummary', () => {
    beforeEach(() => {
      // Mock user timezone and achievements
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1', timezone: 'UTC' });
      mockPrismaService.userAchievement.findMany.mockResolvedValue([]);
      mockPrismaService.userAchievement.createMany.mockResolvedValue({ count: 0 });
    });

    // Helper to format ISO dates
    const makeTxDate = (ymd: string) => new Date(ymd + 'T00:00:00.000Z');

    it('should calculate streak with a gap correctly', async () => {
      // Current date is mocked indirectly by using dates up to today/yesterday.
      // We will pretend today is the current day.
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
      
      const twoDaysAgoDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const twoDaysAgoStr = twoDaysAgoDate.toISOString().split('T')[0];

      const fourDaysAgoDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      const fourDaysAgoStr = fourDaysAgoDate.toISOString().split('T')[0];

      // Expenses on: today, yesterday, and 4 days ago (gap at 2 and 3 days ago)
      // Note: we also add twoDaysAgoStr in mockStreakTx to test another scenario,
      // but let's test a clean gap:
      const mockStreakTx = [
        { transactionDate: makeTxDate(fourDaysAgoStr) },
        { transactionDate: makeTxDate(yesterdayStr) },
        { transactionDate: makeTxDate(todayStr) },
      ];

      mockPrismaService.transaction.findMany.mockImplementation((args) => {
        if (args.where.householdId) return Promise.resolve([]);
        if (args.where.createdByUserId && args.where.type === 'expense') return Promise.resolve(mockStreakTx);
        return Promise.resolve([]);
      });

      const summary = await service.getSummary('h1', 'u1');

      // Today and Yesterday are consecutive -> streak = 2
      // 4 days ago is after a gap -> ignored for current streak
      expect(summary.streakDays).toBe(2);
    });

    it('should calculate streak spanning a month boundary correctly and bestStreakDays per month', async () => {
      // Suppose we have expenses on:
      // July 1st, June 30th, June 29th
      // In this test case, we override the today/yesterday format logic by setting system time or mocking dates.
      // Let's mock todayStr and yesterdayStr by controlling the Date object
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-01T12:00:00.000Z'));

      const mockStreakTx = [
        { transactionDate: makeTxDate('2026-06-29') },
        { transactionDate: makeTxDate('2026-06-30') },
        { transactionDate: makeTxDate('2026-07-01') },
      ];

      mockPrismaService.transaction.findMany.mockImplementation((args) => {
        if (args.where.householdId) return Promise.resolve([]);
        if (args.where.createdByUserId && args.where.type === 'expense') return Promise.resolve(mockStreakTx);
        return Promise.resolve([]);
      });

      const summary = await service.getSummary('h1', 'u1');

      // Restore real Date
      jest.useRealTimers();

      // Current streak spans across June/July -> streakDays should be 3
      expect(summary.streakDays).toBe(3);
      // bestStreakDays is calculated per calendar month:
      // June: 2026-06-29, 2026-06-30 -> streak of 2
      // July: 2026-07-01 -> streak of 1
      // bestStreakDays should be max(2, 1) = 2
      expect(summary.bestStreakDays).toBe(2);
    });

    it('should handle best-streak-in-month tie scenario correctly', async () => {
      const mockStreakTx = [
        { transactionDate: makeTxDate('2026-06-01') },
        { transactionDate: makeTxDate('2026-06-02') },
        { transactionDate: makeTxDate('2026-06-03') }, // streak 3
        { transactionDate: makeTxDate('2026-06-10') },
        { transactionDate: makeTxDate('2026-06-11') },
        { transactionDate: makeTxDate('2026-06-12') }, // streak 3 (tie)
      ];

      mockPrismaService.transaction.findMany.mockImplementation((args) => {
        if (args.where.householdId) return Promise.resolve([]);
        if (args.where.createdByUserId && args.where.type === 'expense') return Promise.resolve(mockStreakTx);
        return Promise.resolve([]);
      });

      const summary = await service.getSummary('h1', 'u1');
      expect(summary.bestStreakDays).toBe(3);
    });

    it('should evaluate and persist all six achievements correctly when conditions are met', async () => {
      // Let's set up dates to unlock all achievements:
      // 1. primeros_pasos: dates.length > 0
      // 2. racha_7: current streak >= 7
      // 3. racha_30: current streak >= 30
      // 4. constancia: 20+ distinct days of expenses in a month
      // 5. ahorro_top: savings ratio positive
      // 6. ingreso_en_alza: month B income > month A income

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-07-30T12:00:00.000Z'));

      // Create 30 consecutive days of expenses ending on today (July 30th)
      const mockStreakTx: { transactionDate: Date }[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date('2026-07-30T00:00:00.000Z');
        d.setUTCDate(d.getUTCDate() - i);
        mockStreakTx.push({ transactionDate: d });
      }

      // User transactions for ratios & income growth
      const mockAllUserTx = [
        // May 2026: Income = 1000, Expenses = 0
        { transactionDate: makeTxDate('2026-05-15'), type: 'income', amount: 1000 },
        // June 2026: Income = 1200, Expenses = 600 (savings ratio = 0.5, income grew from May)
        { transactionDate: makeTxDate('2026-06-15'), type: 'income', amount: 1200 },
        { transactionDate: makeTxDate('2026-06-16'), type: 'expense', amount: 600 },
      ];

      // Add mockAllUserTx details to mockStreakTx
      const mockAllUserTxWithExpenses = [...mockAllUserTx];
      for (const st of mockStreakTx) {
        mockAllUserTxWithExpenses.push({
          transactionDate: st.transactionDate,
          type: 'expense',
          amount: 50,
        });
      }

      mockPrismaService.transaction.findMany.mockImplementation((args) => {
        if (args.where.householdId && args.where.categoryId) return Promise.resolve([]); // budget check
        if (args.where.householdId) return Promise.resolve(mockAllUserTx);
        if (args.where.createdByUserId && args.where.type === 'expense') return Promise.resolve(mockStreakTx);
        if (args.where.createdByUserId) return Promise.resolve(mockAllUserTxWithExpenses);
        return Promise.resolve([]);
      });

      // Mock DB already having no achievements
      mockPrismaService.userAchievement.findMany.mockResolvedValue([]);
      const mockCreateMany = mockPrismaService.userAchievement.createMany;

      await service.getSummary('h1', 'u1');

      jest.useRealTimers();

      // Verify that createMany was called with all 6 achievements
      expect(mockCreateMany).toHaveBeenCalled();
      const createData = mockCreateMany.mock.calls[0][0].data;
      const achievementIds = createData.map((d: any) => d.achievementId);
      
      expect(achievementIds).toContain('primeros_pasos');
      expect(achievementIds).toContain('racha_7');
      expect(achievementIds).toContain('racha_30');
      expect(achievementIds).toContain('constancia');
      expect(achievementIds).toContain('ahorro_top');
      expect(achievementIds).toContain('ingreso_en_alza');
    });
    it('should throw InternalServerErrorException on unexpected database error', async () => {
      mockPrismaService.transaction.findMany.mockRejectedValue(new Error('DB Error'));
      await expect(service.getSummary('h1', 'u1')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
