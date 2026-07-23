import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /// Creates a notification. Internal use only — not exposed via controller.
  async create(data: Prisma.NotificationUncheckedCreateInput) {
    try {
      return await this.prisma.notification.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') return null;
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  /// Returns all undeleted notifications for the given user, newest first.
  async findAllByUser(userId: string) {
    try {
      return await this.prisma.notification.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      throw new InternalServerErrorException('Database error');
    }
  }

  /// Returns a single notification, scoped to the requesting user.
  async findOne(id: string, userId: string) {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!notification) {
        throw new NotFoundException(`Notification ${id} not found`);
      }
      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  /// Soft-deletes a single notification, scoped to the requesting user.
  async remove(id: string, userId: string) {
    try {
      await this.findOne(id, userId);
      return await this.prisma.notification.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Notification ${id} not found`);
        }
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  /// Soft-deletes ALL notifications for the requesting user.
  async deleteAll(userId: string) {
    try {
      return await this.prisma.notification.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    } catch {
      throw new InternalServerErrorException('Database error');
    }
  }
}
