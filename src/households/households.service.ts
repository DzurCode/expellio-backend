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

  async create(createHouseholdDto: CreateHouseholdDto) {
    const { ownerId, ...householdData } = createHouseholdDto;

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

  async join(joinHouseholdDto: JoinHouseholdDto) {
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
            userId: joinHouseholdDto.userId,
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
}
