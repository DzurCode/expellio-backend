import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const rounds = 10;
      const hashedPassword = await bcrypt.hash(createUserDto.passwordHash, rounds);
      const userData = {
        ...createUserDto,
        passwordHash: hashedPassword,
      };
      return await this.prisma.user.create({
        data: userData,
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true, deletionScheduledAt: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Email already in use');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAll() {
    try {
      return await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true, deletionScheduledAt: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true, deletionScheduledAt: true },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      await this.findOne(id); // Check existence
      return await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true, updatedAt: true, deletionScheduledAt: true },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Email already in use');
        if (error.code === 'P2025') throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async scheduleDeletion(id: string) {
    try {
      await this.findOne(id);
      
      // As per policy, scheduled for 30 days
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      return await this.prisma.user.update({
        where: { id },
        data: { deletionScheduledAt: deletionDate },
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true, updatedAt: true, deletionScheduledAt: true },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException(`User with ID ${id} not found`);
      throw new InternalServerErrorException('Database error');
    }
  }

  async cancelDeletion(id: string) {
    try {
      await this.findOne(id);
      return await this.prisma.user.update({
        where: { id },
        data: { deletionScheduledAt: null },
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true, updatedAt: true, deletionScheduledAt: true },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new NotFoundException(`User with ID ${id} not found`);
      throw new InternalServerErrorException('Database error');
    }
  }

  async findByEmailForAuth(email: string) {
    try {
      // sensitive — exclude in service layer (except for auth module login comparison)
      return await this.prisma.user.findFirst({
        where: { email, deletedAt: null },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async incrementFailedLoginAttempts(userId: string, lockedUntil: Date | null) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: { increment: 1 },
          lockedUntil,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async resetFailedLoginAttempts(userId: string) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }
}
