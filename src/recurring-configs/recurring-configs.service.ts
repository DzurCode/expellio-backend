import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringConfigDto } from './dto/create-recurring-config.dto';
import { UpdateRecurringConfigDto } from './dto/update-recurring-config.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RecurringConfigsService {
  constructor(private prisma: PrismaService) {}

  async create(householdId: string, createRecurringConfigDto: CreateRecurringConfigDto) {
    try {
      const { fromDate, toDate, ...data } = createRecurringConfigDto;

      return await this.prisma.$transaction(async (tx) => {
        // Create the config
        const config = await tx.recurringConfig.create({
          data: {
            ...data,
            householdId,
            totalOccurrences: data.totalOccurrences ?? 0,
            fromDate: new Date(fromDate),
            toDate: toDate ? new Date(toDate) : new Date('2099-12-31'),
          },
        });

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
      return await this.prisma.recurringConfig.update({
        where: { id },
        data: { deletedAt: new Date() },
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
