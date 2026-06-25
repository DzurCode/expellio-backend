import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an audit log', async () => {
      const dto = { userId: 'u1', action: AuditAction.create, entityType: 'transactions', entityId: 't1', changes: { a: 1 } };
      mockPrismaService.auditLog.create.mockResolvedValue({ id: 'al1', ...dto });

      const result = await service.create(dto);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
      expect(result.id).toBe('al1');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.auditLog.findUnique.mockResolvedValue(null);
      await expect(service.findOne('al2')).rejects.toThrow(NotFoundException);
    });
  });
});
