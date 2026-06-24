import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ConflictException if email exists', async () => {
      const error = new Error('Prisma error') as any;
      error.code = 'P2002';
      error.name = 'PrismaClientKnownRequestError';
      // Mock instanceof check if needed, or simply make it pass the check
      Object.setPrototypeOf(error, require('@prisma/client').Prisma.PrismaClientKnownRequestError.prototype);
      mockPrismaService.user.create.mockRejectedValue(error);
      const dto = { email: 'test@test.com', passwordHash: 'hash', displayName: 'Test', locale: 'en', timezone: 'UTC' };
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should create user if email does not exist', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue('createdUser');
      const dto = { email: 'test@test.com', passwordHash: 'hash', displayName: 'Test', locale: 'en', timezone: 'UTC' };
      
      const result = await service.create(dto);
      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: dto }));
      expect(result).toBe('createdUser');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(['u1']);
      const result = await service.findAll();
      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result).toEqual(['u1']);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should return user if found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'u1' });
      const result = await service.findOne('u1');
      expect(result).toEqual({ id: 'u1' });
    });
  });

  describe('update', () => {
    it('should update if found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'u1' });
      mockPrismaService.user.update.mockResolvedValue('updated');
      const result = await service.update('u1', { displayName: 'NewName' });
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
        data: { displayName: 'NewName' },
      }));
      expect(result).toBe('updated');
    });
  });

  describe('scheduleDeletion', () => {
    it('should schedule deletion if found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'u1' });
      mockPrismaService.user.update.mockResolvedValue('scheduled');
      const result = await service.scheduleDeletion('u1');
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
        data: { deletionScheduledAt: expect.any(Date) },
      }));
      expect(result).toBe('scheduled');
    });
  });

  describe('cancelDeletion', () => {
    it('should cancel deletion if found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'u1' });
      mockPrismaService.user.update.mockResolvedValue('canceled');
      const result = await service.cancelDeletion('u1');
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'u1' },
        data: { deletionScheduledAt: null },
      }));
      expect(result).toBe('canceled');
    });
  });
});
