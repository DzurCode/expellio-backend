import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';
import { CreateGoalContributionDto } from './dto/create-goal-contribution.dto';
import { UpdateGoalContributionDto } from './dto/update-goal-contribution.dto';
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

  private async recalculateGoalAmount(tx: Prisma.TransactionClient, goalId: string, userId?: string) {
    const sumResult = await tx.goalContribution.aggregate({
      where: { goalId, deletedAt: null },
      _sum: { amount: true },
    });
    const currentAmount = sumResult._sum.amount || new Prisma.Decimal(0);
    await tx.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount },
    });

    try {
      await this.checkGoalMilestones(tx, goalId, userId);
    } catch (error) {
      console.error('Failed to check goal milestones:', error);
    }
  }

  async addContribution(householdId: string, goalId: string, userId: string, dto: CreateGoalContributionDto) {
    try {
      await this.findOne(householdId, goalId);

      return await this.prisma.$transaction(async (tx) => {
        const contribution = await tx.goalContribution.create({
          data: {
            goalId,
            userId,
            amount: dto.amount,
            note: dto.note || null,
            contributedAt: dto.contributedAt ? new Date(dto.contributedAt) : new Date(),
          },
        });

        await this.recalculateGoalAmount(tx, goalId, userId);

        return contribution;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async findContributions(householdId: string, goalId: string) {
    try {
      await this.findOne(householdId, goalId);

      return await this.prisma.goalContribution.findMany({
        where: { goalId, deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: { contributedAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async updateContribution(householdId: string, goalId: string, id: string, dto: UpdateGoalContributionDto) {
    try {
      await this.findOne(householdId, goalId);

      const contribution = await this.prisma.goalContribution.findFirst({
        where: { id, goalId, deletedAt: null },
      });
      if (!contribution) {
        throw new NotFoundException(`GoalContribution with ID ${id} not found`);
      }

      return await this.prisma.$transaction(async (tx) => {
        const updateData: any = {};
        if (dto.amount !== undefined) updateData.amount = dto.amount;
        if (dto.note !== undefined) updateData.note = dto.note || null;
        if (dto.contributedAt !== undefined) {
          updateData.contributedAt = dto.contributedAt ? new Date(dto.contributedAt) : new Date();
        }

        const updated = await tx.goalContribution.update({
          where: { id },
          data: updateData,
        });

        await this.recalculateGoalAmount(tx, goalId, contribution.userId);

        return updated;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async removeContribution(householdId: string, goalId: string, id: string) {
    try {
      await this.findOne(householdId, goalId);

      const contribution = await this.prisma.goalContribution.findFirst({
        where: { id, goalId, deletedAt: null },
      });
      if (!contribution) {
        throw new NotFoundException(`GoalContribution with ID ${id} not found`);
      }

      return await this.prisma.$transaction(async (tx) => {
        const deleted = await tx.goalContribution.update({
          where: { id },
          data: { deletedAt: new Date() },
        });

        await this.recalculateGoalAmount(tx, goalId, contribution.userId);

        return deleted;
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  private async checkGoalMilestones(tx: Prisma.TransactionClient, goalId: string, userId?: string) {
    const goal = await tx.savingsGoal.findUnique({
      where: { id: goalId },
    });

    if (!goal) return;

    const targetAmount = Number(goal.targetAmount);
    const currentAmount = Number(goal.currentAmount);
    if (targetAmount <= 0) return;

    const percent = (currentAmount / targetAmount) * 100;

    let milestone = 0;
    if (percent >= 100) {
      milestone = 100;
    } else if (percent >= 75) {
      milestone = 75;
    } else if (percent >= 50) {
      milestone = 50;
    } else if (percent >= 25) {
      milestone = 25;
    }

    if (milestone === 0) return;

    const householdMembers = await tx.householdMember.findMany({
      where: { householdId: goal.householdId, deletedAt: null },
      select: { userId: true },
    });

    for (const member of householdMembers) {
      if (milestone === 100) {
        // goal_completed: check deduplication by type
        const existing = await tx.notification.findFirst({
          where: {
            userId: member.userId,
            type: 'goal_completed',
            relatedEntityType: 'goal',
            relatedEntityId: goalId,
            deletedAt: null,
          },
        });
        if (existing) continue;

        await tx.notification.create({
          data: {
            userId: member.userId,
            householdId: goal.householdId,
            type: 'goal_completed',
            title: '¡Meta de Ahorro Completada! 🎯',
            body: `¡Felicidades! Has completado el 100% de tu meta "${goal.name}". Ahorrado: $${currentAmount.toFixed(0)}.`,
            actionUrl: '/savings-goals',
            relatedEntityType: 'goal',
            relatedEntityId: goalId,
          },
        });
      } else {
        // goal_milestone: check deduplication by percentage in body
        const existing = await tx.notification.findFirst({
          where: {
            userId: member.userId,
            type: 'goal_milestone',
            relatedEntityType: 'goal',
            relatedEntityId: goalId,
            body: { contains: `alcanzado el ${milestone}%` },
            deletedAt: null,
          },
        });
        if (existing) continue;

        await tx.notification.create({
          data: {
            userId: member.userId,
            householdId: goal.householdId,
            type: 'goal_milestone',
            title: '¡Hito de Ahorro Alcanzado! 🚀',
            body: `Has alcanzado el ${milestone}% de tu meta "${goal.name}". Ahorrado: $${currentAmount.toFixed(0)} de $${targetAmount.toFixed(0)}.`,
            actionUrl: '/savings-goals',
            relatedEntityType: 'goal',
            relatedEntityId: goalId,
          },
        });
      }
    }
  }
}
