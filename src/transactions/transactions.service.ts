import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(householdId: string, createdByUserId: string, createTransactionDto: CreateTransactionDto) {
    try {
      const { splits, ...data } = createTransactionDto;

      return await this.prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            ...data,
            householdId,
            createdByUserId,
            transactionDate: new Date(data.transactionDate),
          },
        });

        if (splits && splits.length > 0) {
          const splitsData = splits.map((s) => ({
            ...s,
            transactionId: transaction.id,
          }));
          await tx.transactionSplit.createMany({
            data: splitsData,
          });
        }

        return transaction;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Transaction conflict');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAll(householdId: string) {
    try {
      return await this.prisma.transaction.findMany({
        where: { householdId, deletedAt: null },
        include: { splits: true, category: true },
        orderBy: { transactionDate: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(householdId: string, id: string) {
    try {
      const transaction = await this.prisma.transaction.findFirst({
        where: { id, householdId, deletedAt: null },
        include: { splits: true, category: true },
      });
      if (!transaction) {
        throw new NotFoundException(`Transaction with ID ${id} not found`);
      }
      return transaction;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(householdId: string, id: string, updateTransactionDto: UpdateTransactionDto) {
    try {
      await this.findOne(householdId, id);
      const { splits, ...data } = updateTransactionDto;

      return await this.prisma.$transaction(async (tx) => {
        const updateData: any = { ...data };
        if (data.transactionDate) {
          updateData.transactionDate = new Date(data.transactionDate);
        }

        const transaction = await tx.transaction.update({
          where: { id },
          data: updateData,
        });

        if (splits) {
          // Replace splits: delete old ones and create new ones
          await tx.transactionSplit.deleteMany({
            where: { transactionId: id },
          });
          if (splits.length > 0) {
            const splitsData = splits.map((s) => ({
              ...s,
              transactionId: transaction.id,
            }));
            await tx.transactionSplit.createMany({
              data: splitsData,
            });
          }
        }

        return transaction;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`Transaction with ID ${id} not found`);
        if (error.code === 'P2002') throw new ConflictException('Transaction duplicate conflict');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async remove(householdId: string, id: string) {
    try {
      await this.findOne(householdId, id);
      return await this.prisma.transaction.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`Transaction with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async getSummary(householdId: string, userId: string) {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      // Start of 6 months ago (first day of that month)
      const startOfSixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);

      // Fetch all transactions from 6 months ago to now
      const transactions = await this.prisma.transaction.findMany({
        where: {
          householdId,
          deletedAt: null,
          transactionDate: {
            gte: startOfSixMonthsAgo,
          },
        },
      });

      // Calculate current month's totals
      let income = 0;
      let expenses = 0;

      // Group totals by month for the last 6 months
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthlyDataMap = new Map<string, { income: number; expenses: number }>();

      // Initialize the last 6 months in order
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const label = monthNames[d.getMonth()];
        monthlyDataMap.set(label, { income: 0, expenses: 0 });
      }

      for (const tx of transactions) {
        const txDate = new Date(tx.transactionDate);
        const txMonth = txDate.getMonth();
        const txYear = txDate.getFullYear();
        const amount = Number(tx.amount);

        // Check if current month
        if (txYear === currentYear && txMonth === currentMonth) {
          if (tx.type === 'income') {
            income += amount;
          } else if (tx.type === 'expense') {
            expenses += amount;
          }
        }

        // Add to historical month slot if present
        const label = monthNames[txMonth];
        const slot = monthlyDataMap.get(label);
        if (slot) {
          if (tx.type === 'income') {
            slot.income += amount;
          } else if (tx.type === 'expense') {
            slot.expenses += amount;
          }
        }
      }

      const monthlyData = Array.from(monthlyDataMap.entries()).map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
      }));

      // Fetch user to use their timezone settings for date calculation
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { timezone: true },
      });
      const userTimezone = user?.timezone || 'UTC';

      // Formatter to get YYYY-MM-DD in user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      
      const formatToYmd = (date: Date) => {
        const parts = formatter.formatToParts(date);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}-${month}-${day}`;
      };

      const todayStr = formatToYmd(new Date());
      const yesterdayStr = formatToYmd(new Date(Date.now() - 24 * 60 * 60 * 1000));

      // Fetch all expense transactions for streak calculation
      const expensesData = await this.prisma.transaction.findMany({
        where: {
          createdByUserId: userId,
          type: 'expense',
          deletedAt: null,
        },
        select: {
          transactionDate: true,
        },
        orderBy: {
          transactionDate: 'asc',
        },
      });

      // Format unique dates (UTC date string from database DATE field)
      const dates = Array.from(
        new Set(expensesData.map(e => e.transactionDate.toISOString().split('T')[0]))
      ).sort();

      const getPreviousDateStr = (dateStr: string): string => {
        const d = new Date(dateStr + 'T00:00:00.000Z');
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().split('T')[0];
      };

      // Calculate current streak (up to today or yesterday)
      let streakDays = 0;
      const dateSet = new Set(dates);
      const lastLoggedDate = dateSet.has(todayStr) ? todayStr : (dateSet.has(yesterdayStr) ? yesterdayStr : null);
      if (lastLoggedDate) {
        let curr = lastLoggedDate;
        while (dateSet.has(curr)) {
          streakDays++;
          curr = getPreviousDateStr(curr);
        }
      }

      // Calculate best streak in a calendar month
      const datesByMonth: { [key: string]: string[] } = {};
      for (const date of dates) {
        const monthKey = date.substring(0, 7); // 'YYYY-MM'
        if (!datesByMonth[monthKey]) {
          datesByMonth[monthKey] = [];
        }
        datesByMonth[monthKey].push(date);
      }

      let bestStreakDays = 0;
      for (const monthKey in datesByMonth) {
        const monthDates = datesByMonth[monthKey];
        let currentMonthStreak = 0;
        let bestMonthStreak = 0;
        let prevDateStr: string | null = null;

        for (const dateStr of monthDates) {
          if (prevDateStr === null) {
            currentMonthStreak = 1;
          } else {
            const expectedPrev = getPreviousDateStr(dateStr);
            if (prevDateStr === expectedPrev) {
              currentMonthStreak++;
            } else {
              currentMonthStreak = 1;
            }
          }
          if (currentMonthStreak > bestMonthStreak) {
            bestMonthStreak = currentMonthStreak;
          }
          prevDateStr = dateStr;
        }

        if (bestMonthStreak > bestStreakDays) {
          bestStreakDays = bestMonthStreak;
        }
      }

      // Evaluate achievements
      const allUserTx = await this.prisma.transaction.findMany({
        where: {
          createdByUserId: userId,
          deletedAt: null,
        },
        select: {
          transactionDate: true,
          type: true,
          amount: true,
        },
      });

      const monthlyTotals: { [key: string]: { income: number; expenses: number } } = {};
      for (const tx of allUserTx) {
        const dateStr = tx.transactionDate.toISOString().split('T')[0];
        const monthKey = dateStr.substring(0, 7);
        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = { income: 0, expenses: 0 };
        }
        const amount = Number(tx.amount);
        if (tx.type === 'income') {
          monthlyTotals[monthKey].income += amount;
        } else if (tx.type === 'expense') {
          monthlyTotals[monthKey].expenses += amount;
        }
      }

      // 1. primeros_pasos: first expense registered
      const hasPrimerosPasos = dates.length > 0;

      // 2. racha_7: current streak >= 7 days
      const hasRacha7 = streakDays >= 7;

      // 3. racha_30: current streak >= 30 days
      const hasRacha30 = streakDays >= 30;

      // 4. constancia: 20+ distinct days of expenses in a month
      const hasConstancia = Object.values(datesByMonth).some(monthDates => monthDates.length >= 20);

      // 5. ahorro_top: month with highest savings ratio (income - expenses) / income compared to own history
      const monthlyRatios: { month: string; ratio: number }[] = [];
      for (const monthKey in monthlyTotals) {
        const { income, expenses } = monthlyTotals[monthKey];
        if (income > 0) {
          const ratio = (income - expenses) / income;
          monthlyRatios.push({ month: monthKey, ratio });
        }
      }
      const hasAhorroTop = monthlyRatios.length > 0 && monthlyRatios.some(r => r.ratio > 0);

      // 6. ingreso_en_alza: monthly income higher than previous month's
      let hasIngresoEnAlza = false;
      const monthKeys = Object.keys(monthlyTotals).sort();
      if (monthKeys.length > 1) {
        const firstMonth = monthKeys[0];
        const lastMonth = monthKeys[monthKeys.length - 1];
        
        const allMonths: string[] = [];
        const current = new Date(firstMonth + '-02T00:00:00.000Z');
        const end = new Date(lastMonth + '-02T00:00:00.000Z');
        
        while (current <= end) {
          allMonths.push(current.toISOString().substring(0, 7));
          current.setUTCMonth(current.getUTCMonth() + 1);
        }
        
        for (let i = 1; i < allMonths.length; i++) {
          const prevIncome = monthlyTotals[allMonths[i - 1]]?.income || 0;
          const currIncome = monthlyTotals[allMonths[i]]?.income || 0;
          if (currIncome > prevIncome) {
            hasIngresoEnAlza = true;
            break;
          }
        }
      }

      // Idempotently upsert achievements
      const achievementsToUnlock: string[] = [];
      if (hasPrimerosPasos) achievementsToUnlock.push('primeros_pasos');
      if (hasRacha7) achievementsToUnlock.push('racha_7');
      if (hasRacha30) achievementsToUnlock.push('racha_30');
      if (hasConstancia) achievementsToUnlock.push('constancia');
      if (hasAhorroTop) achievementsToUnlock.push('ahorro_top');
      if (hasIngresoEnAlza) achievementsToUnlock.push('ingreso_en_alza');

      if (achievementsToUnlock.length > 0) {
        const unlocked = await this.prisma.userAchievement.findMany({
          where: {
            userId,
            achievementId: { in: achievementsToUnlock },
          },
          select: { achievementId: true },
        });
        const unlockedSet = new Set(unlocked.map(u => u.achievementId));
        
        const toCreate = achievementsToUnlock.filter(id => !unlockedSet.has(id));
        if (toCreate.length > 0) {
          await this.prisma.userAchievement.createMany({
            data: toCreate.map(id => ({
              userId,
              achievementId: id,
              unlockedAt: new Date(),
            })),
          });
        }
      }

      const userAchievements = await this.prisma.userAchievement.findMany({
        where: { userId },
        select: {
          achievementId: true,
          unlockedAt: true,
        },
        orderBy: { unlockedAt: 'asc' },
      });

      const achievements = userAchievements.map(ua => ({
        id: ua.achievementId,
        unlockedAt: ua.unlockedAt,
      }));

      return {
        income,
        expenses,
        streakDays,
        bestStreakDays,
        monthlyData,
        achievements,
      };
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }
}
