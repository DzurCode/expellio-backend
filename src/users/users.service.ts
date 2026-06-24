import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      // In a real app, hash password here before saving
      return await this.prisma.user.create({
        data: createUserDto,
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true },
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
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true },
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
        select: { id: true, email: true, displayName: true, avatarUrl: true, locale: true, timezone: true, createdAt: true, updatedAt: true },
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
}
