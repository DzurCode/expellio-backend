import { Test, TestingModule } from '@nestjs/testing';
import { AiJobsService } from './ai-jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AiJobType } from '@prisma/client';

describe('AiJobsService', () => {
  let service: AiJobsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    aiJob: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiJobsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AiJobsService>(AiJobsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an AI job', async () => {
      const dto = { jobType: AiJobType.voice_transcription };
      mockPrismaService.aiJob.create.mockResolvedValue({ id: 'a1', ...dto, initiatedByUserId: 'u1', householdId: 'h1' });

      const result = await service.create('h1', 'u1', dto as any);
      expect(mockPrismaService.aiJob.create).toHaveBeenCalled();
      expect(result.id).toBe('a1');
    });
  });

  describe('findOne', () => {
    it('should return job if found', async () => {
      mockPrismaService.aiJob.findFirst.mockResolvedValue({ id: 'a1' });
      const result = await service.findOne('h1', 'a1');
      expect(result.id).toBe('a1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.aiJob.findFirst.mockResolvedValue(null);
      await expect(service.findOne('h1', 'a2')).rejects.toThrow(NotFoundException);
    });
  });
});
