import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class HouseholdsService {
  constructor(private prisma: PrismaService) {}

  async create(createHouseholdDto: CreateHouseholdDto) {
    const { ownerId, ...householdData } = createHouseholdDto;

    // Create household and owner member in a transaction
    return this.prisma.$transaction(async (tx) => {
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
  }

  async findAll() {
    return this.prisma.household.findMany({
      where: { deletedAt: null },
      include: { members: true },
    });
  }

  async findOne(id: string) {
    const household = await this.prisma.household.findFirst({
      where: { id, deletedAt: null },
      include: { members: true },
    });
    if (!household) {
      throw new NotFoundException(`Household with ID ${id} not found`);
    }
    return household;
  }

  async update(id: string, updateHouseholdDto: UpdateHouseholdDto) {
    await this.findOne(id);
    return this.prisma.household.update({
      where: { id },
      data: updateHouseholdDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.household.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async generateInvite(id: string) {
    const household = await this.findOne(id);
    if (household.mode !== 'couple') {
      throw new BadRequestException('Invites are only available in couple mode');
    }

    const inviteCode = randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Expires in 48 hours

    return this.prisma.household.update({
      where: { id },
      data: {
        inviteCode,
        inviteExpiresAt: expiresAt,
      },
    });
  }

  async join(joinHouseholdDto: JoinHouseholdDto) {
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
    return this.prisma.$transaction(async (tx) => {
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
  }
}
