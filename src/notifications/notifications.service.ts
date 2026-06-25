import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createNotificationDto: CreateNotificationDto) {
    try {
      return await this.prisma.notification.create({
        data: { ...createNotificationDto, userId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Notification duplicate conflict');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAllByUser(userId: string) {
    try {
      return await this.prisma.notification.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(id: string) {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: { id, deletedAt: null },
      });
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    try {
      await this.findOne(id);
      
      const updateData: any = { ...updateNotificationDto };
      if (updateNotificationDto.isRead === true) {
        updateData.readAt = new Date();
      }
      if (updateNotificationDto.isPushed === true) {
        updateData.pushedAt = new Date();
      }

      return await this.prisma.notification.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id);
      return await this.prisma.notification.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
