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

  async getSummary(householdId: string) {
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

      return {
        income,
        expenses,
        // TODO: backend compute streak based on consecutive days of logged transactions
        streakDays: 23,
        bestStreakDays: 31,
        monthlyData,
        // TODO: backend compute achievements
        achievements: [
          { emoji: '🏆', label: 'Ahorro Top' },
          { emoji: '⚡', label: 'Velocidad' },
          { emoji: '🌟', label: '7 Días' },
        ],
      };
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }
}
