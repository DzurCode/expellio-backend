import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: createUserDto.email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    // In a real app, hash password here before saving
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Check existence
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true, updatedAt: true },
    });
  }

  async scheduleDeletion(id: string) {
    await this.findOne(id);
    
    // As per policy, scheduled for 30 days
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    return this.prisma.user.update({
      where: { id },
      data: { deletionScheduledAt: deletionDate },
    });
  }

  async cancelDeletion(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletionScheduledAt: null },
    });
  }
}
