import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringConfigDto } from './dto/create-recurring-config.dto';
import { UpdateRecurringConfigDto } from './dto/update-recurring-config.dto';
import { Prisma, RecurringFrequency, TransactionSource } from '@prisma/client';

@Injectable()
export class RecurringConfigsService {
  constructor(private prisma: PrismaService) {}

  private calculateMaxToDate(fromDate: Date, frequency: RecurringFrequency): Date {
    const maxDate = new Date(fromDate);
    switch (frequency) {
      case RecurringFrequency.daily:
        maxDate.setDate(maxDate.getDate() + 7);
        break;
      case RecurringFrequency.weekly:
        maxDate.setDate(maxDate.getDate() + 28);
        break;
      case RecurringFrequency.monthly:
        maxDate.setMonth(maxDate.getMonth() + 12);
        break;
      case RecurringFrequency.yearly:
        maxDate.setFullYear(maxDate.getFullYear() + 5);
        break;
    }
    return maxDate;
  }

  private generateOccurrenceDates(fromDate: Date, toDate: Date, frequency: RecurringFrequency, totalOccurrences: number): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(fromDate);
    let count = 0;
    
    // Safety limit of 1000 occurrences to prevent infinite loops/memory issues
    const maxLimit = totalOccurrences > 0 ? totalOccurrences : 1000;

    while (currentDate <= toDate && count < maxLimit) {
      dates.push(new Date(currentDate));
      count++;
      switch (frequency) {
        case RecurringFrequency.daily:
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case RecurringFrequency.weekly:
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case RecurringFrequency.monthly:
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case RecurringFrequency.yearly:
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }
    return dates;
  }

  async create(householdId: string, createdByUserId: string, createRecurringConfigDto: CreateRecurringConfigDto) {
    try {
      const { fromDate, toDate, ...data } = createRecurringConfigDto;

      return await this.prisma.$transaction(async (tx) => {
        const parsedFromDate = new Date(fromDate);
        const parsedToDate = toDate ? new Date(toDate) : this.calculateMaxToDate(parsedFromDate, data.frequency);

        // Create the config
        const config = await tx.recurringConfig.create({
          data: {
            ...data,
            householdId,
            createdByUserId,
            totalOccurrences: data.totalOccurrences ?? 0,
            fromDate: parsedFromDate,
            toDate: parsedToDate,
          },
        });

        // Generate transactions
        const occurrenceDates = this.generateOccurrenceDates(parsedFromDate, parsedToDate, data.frequency, data.totalOccurrences ?? 0);
        
        if (occurrenceDates.length > 0) {
          const transactionsData = occurrenceDates.map((date) => ({
            householdId,
            categoryId: data.categoryId,
            createdByUserId,
            recurringConfigId: config.id,
            type: data.type,
            amount: data.amount,
            description: data.description || null,
            transactionDate: date,
            source: TransactionSource.recurring_auto,
          }));

          await tx.transaction.createMany({
            data: transactionsData,
          });
        }

        return config;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Recurring config conflict');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAll(householdId: string) {
    try {
      return await this.prisma.recurringConfig.findMany({
        where: { householdId, deletedAt: null },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(householdId: string, id: string) {
    try {
      const config = await this.prisma.recurringConfig.findFirst({
        where: { id, householdId, deletedAt: null },
        include: { category: true },
      });
      if (!config) {
        throw new NotFoundException(`RecurringConfig with ID ${id} not found`);
      }
      return config;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(householdId: string, id: string, updateRecurringConfigDto: UpdateRecurringConfigDto) {
    try {
      await this.findOne(householdId, id);

      const updateData: any = { ...updateRecurringConfigDto };
      if (updateRecurringConfigDto.fromDate) {
        updateData.fromDate = new Date(updateRecurringConfigDto.fromDate);
      }
      if (updateRecurringConfigDto.toDate) {
        updateData.toDate = new Date(updateRecurringConfigDto.toDate);
      }

      return await this.prisma.$transaction(async (tx) => {
        const config = await tx.recurringConfig.update({
          where: { id },
          data: updateData,
        });

        // Update future auto-generated transactions linked to this config
        if (updateData.amount !== undefined || updateData.categoryId !== undefined) {
          await tx.transaction.updateMany({
            where: {
              recurringConfigId: id,
              transactionDate: { gt: new Date() },
              deletedAt: null,
            },
            data: {
              ...(updateData.amount !== undefined ? { amount: updateData.amount } : {}),
              ...(updateData.categoryId !== undefined ? { categoryId: updateData.categoryId } : {}),
            },
          });
        }

        return config;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`RecurringConfig with ID ${id} not found`);
        if (error.code === 'P2002') throw new ConflictException('Recurring config duplicate conflict');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async remove(householdId: string, id: string) {
    try {
      await this.findOne(householdId, id);
      return await this.prisma.$transaction(async (tx) => {
        const deletedConfig = await tx.recurringConfig.update({
          where: { id },
          data: { deletedAt: new Date() },
        });

        // Also soft-delete future generated transactions that haven't happened yet
        await tx.transaction.updateMany({
          where: {
            recurringConfigId: id,
            transactionDate: { gt: new Date() },
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
        
        return deletedConfig;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`RecurringConfig with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
