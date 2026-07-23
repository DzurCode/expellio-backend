import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async create(householdId: string, createBudgetDto: CreateBudgetDto) {
    try {
      const { startDate, ...data } = createBudgetDto;
      return await this.prisma.budget.create({
        data: {
          ...data,
          householdId,
          startDate: new Date(startDate),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Budget already exists');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAll(householdId: string) {
    try {
      return await this.prisma.budget.findMany({
        where: { householdId, deletedAt: null },
        include: { alerts: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(householdId: string, id: string) {
    try {
      const budget = await this.prisma.budget.findFirst({
        where: { id, householdId, deletedAt: null },
        include: { alerts: true },
      });
      if (!budget) {
        throw new NotFoundException(`Budget with ID ${id} not found`);
      }
      return budget;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(householdId: string, id: string, updateBudgetDto: UpdateBudgetDto) {
    try {
      await this.findOne(householdId, id);

      const { startDate, ...rest } = updateBudgetDto;
      const dataToUpdate: Prisma.BudgetUpdateInput = { ...rest };
      if (startDate) {
        dataToUpdate.startDate = new Date(startDate);
      }

      return await this.prisma.budget.update({
        where: { id },
        data: dataToUpdate,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`Budget with ID ${id} not found`);
        if (error.code === 'P2002') throw new ConflictException('Budget duplicate conflict');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async remove(householdId: string, id: string) {
    try {
      await this.findOne(householdId, id);
      return await this.prisma.budget.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`Budget with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
