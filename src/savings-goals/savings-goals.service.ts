import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SavingsGoalsService {
  constructor(private prisma: PrismaService) {}

  async create(householdId: string, createSavingsGoalDto: CreateSavingsGoalDto) {
    try {
      const { targetDate, ...data } = createSavingsGoalDto;
      return await this.prisma.savingsGoal.create({
        data: {
          ...data,
          householdId,
          targetDate: targetDate ? new Date(targetDate) : null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Savings goal already exists');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAll(householdId: string) {
    try {
      return await this.prisma.savingsGoal.findMany({
        where: { householdId, deletedAt: null },
        include: { contributions: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(householdId: string, id: string) {
    try {
      const goal = await this.prisma.savingsGoal.findFirst({
        where: { id, householdId, deletedAt: null },
        include: { contributions: true },
      });
      if (!goal) {
        throw new NotFoundException(`SavingsGoal with ID ${id} not found`);
      }
      return goal;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(householdId: string, id: string, updateSavingsGoalDto: UpdateSavingsGoalDto) {
    try {
      await this.findOne(householdId, id);
      const updateData: any = { ...updateSavingsGoalDto };
      if (updateSavingsGoalDto.targetDate) {
        updateData.targetDate = new Date(updateSavingsGoalDto.targetDate);
      }
      return await this.prisma.savingsGoal.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`SavingsGoal with ID ${id} not found`);
        if (error.code === 'P2002') throw new ConflictException('Savings goal duplicate conflict');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async remove(householdId: string, id: string) {
    try {
      await this.findOne(householdId, id);
      return await this.prisma.savingsGoal.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`SavingsGoal with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
