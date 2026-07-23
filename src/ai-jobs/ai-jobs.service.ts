import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAiJobDto } from './dto/create-ai-job.dto';
import { UpdateAiJobDto } from './dto/update-ai-job.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AiJobsService {
  constructor(private prisma: PrismaService) {}

  async create(householdId: string, initiatedByUserId: string, createAiJobDto: CreateAiJobDto) {
    try {
      return await this.prisma.aiJob.create({
        data: {
          ...createAiJobDto,
          householdId,
          initiatedByUserId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('AiJob duplicate conflict');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAll(householdId: string) {
    try {
      return await this.prisma.aiJob.findMany({
        where: { householdId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(householdId: string, id: string) {
    try {
      const aiJob = await this.prisma.aiJob.findFirst({
        where: { id, householdId, deletedAt: null },
      });
      if (!aiJob) {
        throw new NotFoundException(`AiJob with ID ${id} not found`);
      }
      return aiJob;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(householdId: string, id: string, updateAiJobDto: UpdateAiJobDto) {
    try {
      const existing = await this.findOne(householdId, id);
      const updated = await this.prisma.aiJob.update({
        where: { id },
        data: updateAiJobDto,
      });

      const newStatus = updateAiJobDto.status;
      const wasTerminal = newStatus === 'completed' || newStatus === 'failed';
      const wasAlreadyTerminal =
        existing.status === 'completed' || existing.status === 'failed';

      if (wasTerminal && !wasAlreadyTerminal) {
        const isSuccess = newStatus === 'completed';
        // TODO: weekly_summary — implement notification via a cron scheduler
        await this.prisma.notification.create({
          data: {
            userId: existing.initiatedByUserId,
            householdId,
            type: 'ai_complete',
            title: isSuccess
              ? 'Análisis de IA completado ✅'
              : 'Análisis de IA fallido ⚠️',
            body: isSuccess
              ? `Tu análisis ha terminado: ${updated.resultSummary ?? 'sin detalles'}.`
              : `El análisis falló: ${updated.errorMessage ?? 'error desconocido'}.`,
            relatedEntityType: 'ai_job',
            relatedEntityId: id,
          },
        });
      }

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`AiJob with ID ${id} not found`);
        if (error.code === 'P2002') throw new ConflictException('AiJob duplicate conflict');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async remove(householdId: string, id: string) {
    try {
      await this.findOne(householdId, id);
      return await this.prisma.aiJob.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException(`AiJob with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
