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
        include: { splits: true },
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
        include: { splits: true },
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
}
