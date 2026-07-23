import { Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class HouseholdsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, createHouseholdDto: CreateHouseholdDto) {
    const householdData = createHouseholdDto;

    try {
      // Create household and owner member in a transaction
      return await this.prisma.$transaction(async (tx) => {
        const household = await tx.household.create({
          data: householdData,
        });

        await tx.householdMember.create({
          data: {
            householdId: household.id,
            userId: ownerId,
            role: 'owner',
          },
        });

        return household;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Duplicate household data');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAll() {
    try {
      return await this.prisma.household.findMany({
        where: { deletedAt: null },
        include: { members: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(id: string) {
    try {
      const household = await this.prisma.household.findFirst({
        where: { id, deletedAt: null },
        include: { members: true },
      });
      if (!household) {
        throw new NotFoundException(`Household with ID ${id} not found`);
      }
      return household;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(id: string, updateHouseholdDto: UpdateHouseholdDto) {
    try {
      await this.findOne(id);
      return await this.prisma.household.update({
        where: { id },
        data: updateHouseholdDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`Household with ID ${id} not found`);
        if (error.code === 'P2002') throw new ConflictException('Duplicate household data');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id);
      return await this.prisma.household.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException(`Household with ID ${id} not found`);
      throw new InternalServerErrorException('Database error');
    }
  }

  async generateInvite(id: string) {
    try {
      const household = await this.findOne(id);
      if (household.mode !== 'couple') {
        throw new BadRequestException('Invites are only available in couple mode');
      }

      const inviteCode = randomBytes(16).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // Expires in 48 hours

      return await this.prisma.household.update({
        where: { id },
        data: {
          inviteCode,
          inviteExpiresAt: expiresAt,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException(`Household not found`);
      throw new InternalServerErrorException('Database error');
    }
  }

  async join(userId: string, joinHouseholdDto: JoinHouseholdDto) {
    try {
      const household = await this.prisma.household.findFirst({
        where: {
          inviteCode: joinHouseholdDto.inviteCode,
          inviteExpiresAt: { gt: new Date() },
          deletedAt: null,
        },
        include: { members: true },
      });

      if (!household) {
        throw new BadRequestException('Invalid or expired invite code');
      }

      if (household.members.length >= 2) {
        throw new BadRequestException('Household is already full (max 2 members in couple mode)');
      }

      // Add user as member and clear invite code
      return await this.prisma.$transaction(async (tx) => {
        const member = await tx.householdMember.create({
          data: {
            householdId: household.id,
            userId: userId,
            role: 'member',
          },
        });

        await tx.household.update({
          where: { id: household.id },
          data: {
            inviteCode: null,
            inviteExpiresAt: null,
          },
        });

        // Notify the household owner about the new member
        const owner = household.members.find((m) => m.role === 'owner');
        if (owner) {
          await tx.notification.create({
            data: {
              userId: owner.userId,
              householdId: household.id,
              type: 'household_invite',
              title: 'Nuevo miembro en tu hogar 👥',
              body: `Un nuevo miembro se ha unido a "${household.name}".`,
              actionUrl: '/settings',
              relatedEntityType: 'household',
              relatedEntityId: household.id,
            },
          });
        }

        // Notify the joining user
        await tx.notification.create({
          data: {
            userId,
            householdId: household.id,
            type: 'household_invite',
            title: '¡Te has unido a un hogar! 🏠',
            body: `Ahora eres miembro de "${household.name}". ¡Bienvenido!`,
            actionUrl: '/settings',
            relatedEntityType: 'household',
            relatedEntityId: household.id,
          },
        });

        return member;
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('User is already a member');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async reset(id: string) {
    try {
      await this.findOne(id);
      return await this.prisma.$transaction(async (tx) => {
        // 1. Delete transaction splits
        await tx.transactionSplit.deleteMany({
          where: { transaction: { householdId: id } },
        });

        // 2. Delete goal contributions
        await tx.goalContribution.deleteMany({
          where: { goal: { householdId: id } },
        });

        // 3. Delete budget alerts
        await tx.budgetAlert.deleteMany({
          where: { householdId: id },
        });

        // 4. Delete transactions
        await tx.transaction.deleteMany({
          where: { householdId: id },
        });

        // 5. Delete recurring configs
        await tx.recurringConfig.deleteMany({
          where: { householdId: id },
        });

        // 6. Delete budgets
        await tx.budget.deleteMany({
          where: { householdId: id },
        });

        // 7. Delete savings goals
        await tx.savingsGoal.deleteMany({
          where: { householdId: id },
        });

        // 8. Delete weekly summaries
        await tx.aiWeeklySummary.deleteMany({
          where: { householdId: id },
        });

        // 9. Delete AI jobs
        await tx.aiJob.deleteMany({
          where: { householdId: id },
        });

        // 10. Delete notifications
        await tx.notification.deleteMany({
          where: { householdId: id },
        });

        // 11. Delete custom categories
        await tx.category.deleteMany({
          where: { householdId: id, isSystem: false },
        });

        return { message: 'Household data reset successfully' };
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error while resetting household data');
    }
  }
}
