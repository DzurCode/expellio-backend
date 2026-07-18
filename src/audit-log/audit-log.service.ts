import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}



  async findAllByHousehold(householdId: string) {
    try {
      return await this.prisma.auditLog.findMany({
        where: { householdId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(id: string) {
    try {
      const log = await this.prisma.auditLog.findUnique({
        where: { id },
      });
      if (!log) {
        throw new NotFoundException(`AuditLog with ID ${id} not found`);
      }
      return log;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  // Audit logs are append-only. No update or remove methods provided.
}
