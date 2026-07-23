import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

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

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'app.inviteCode') return 'MIAPP-BETA-2026';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
      Object.setPrototypeOf(
        error,
        require('@prisma/client').Prisma.PrismaClientKnownRequestError
          .prototype,
      );
      mockPrismaService.user.create.mockRejectedValue(error);
      const dto = {
        email: 'test@test.com',
        passwordHash: 'hash',
        displayName: 'Test',
        locale: 'en',
        timezone: 'UTC',
        inviteCode: 'MIAPP-BETA-2026',
      };
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should create user if email does not exist', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue('createdUser');
      const dto = {
        email: 'test@test.com',
        passwordHash: 'hash',
        displayName: 'Test',
        locale: 'en',
        timezone: 'UTC',
        inviteCode: 'MIAPP-BETA-2026',
      };

      const result = await service.create(dto);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@test.com',
            displayName: 'Test',
            passwordHash: expect.any(String),
          }),
        }),
      );
      expect(result).toBe('createdUser');
    });
  });

  describe('register', () => {
    it('should throw BadRequestException if code matches incorrect', async () => {
      const dto = {
        email: 'test@test.com',
        passwordHash: 'hash',
        displayName: 'Test',
        inviteCode: 'WRONG',
      };
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code is empty', async () => {
      const dto = {
        email: 'test@test.com',
        passwordHash: 'hash',
        displayName: 'Test',
        inviteCode: '',
      };
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
    });

    it('should call create if code matches', async () => {
      const dto = {
        email: 'test@test.com',
        passwordHash: 'hash',
        displayName: 'Test',
        inviteCode: 'MIAPP-BETA-2026',
      };
      const mockCreatedUser = {
        id: '1',
        email: 'test@test.com',
        displayName: 'Test',
        avatarUrl: null,
        locale: 'en',
        timezone: 'UTC',
        createdAt: new Date(),
        deletionScheduledAt: null,
      };
      jest.spyOn(service, 'create').mockResolvedValue(mockCreatedUser);
      const result = await service.register(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(mockCreatedUser);
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
      await expect(service.findOne('invalid')).rejects.toThrow(
        NotFoundException,
      );
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
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: { displayName: 'NewName' },
        }),
      );
      expect(result).toBe('updated');
    });
  });

  describe('scheduleDeletion', () => {
    it('should schedule deletion if found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'u1' });
      mockPrismaService.user.update.mockResolvedValue('scheduled');
      const result = await service.scheduleDeletion('u1');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: { deletionScheduledAt: expect.any(Date) },
        }),
      );
      expect(result).toBe('scheduled');
    });
  });

  describe('cancelDeletion', () => {
    it('should cancel deletion if found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'u1' });
      mockPrismaService.user.update.mockResolvedValue('canceled');
      const result = await service.cancelDeletion('u1');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: { deletionScheduledAt: null },
        }),
      );
      expect(result).toBe('canceled');
    });
  });

  describe('findByEmailForAuth', () => {
    it('should find user by email', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
      });
      const result = await service.findByEmailForAuth('test@test.com');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@test.com', deletedAt: null },
      });
      expect(result).toEqual({ id: 'u1', email: 'test@test.com' });
    });
  });

  describe('incrementFailedLoginAttempts', () => {
    it('should increment failed attempts', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        id: 'u1',
        failedLoginAttempts: 1,
      });
      const lockedUntil = new Date();
      const result = await service.incrementFailedLoginAttempts(
        'u1',
        lockedUntil,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          failedLoginAttempts: { increment: 1 },
          lockedUntil,
        },
      });
      expect(result).toEqual({ id: 'u1', failedLoginAttempts: 1 });
    });
  });

  describe('resetFailedLoginAttempts', () => {
    it('should reset failed attempts', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        id: 'u1',
        failedLoginAttempts: 0,
      });
      const result = await service.resetFailedLoginAttempts('u1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      expect(result).toEqual({ id: 'u1', failedLoginAttempts: 0 });
    });
  });
});
