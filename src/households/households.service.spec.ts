import { Test, TestingModule } from '@nestjs/testing';
import { HouseholdsService } from './households.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('HouseholdsService', () => {
  let service: HouseholdsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    household: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    householdMember: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback) => {
      return callback(mockPrismaService);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HouseholdsService>(HouseholdsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create household and owner member in transaction', async () => {
      mockPrismaService.household.create.mockResolvedValue({ id: 'hh1' });
      const dto = { name: 'My Home', mode: 'couple', ownerId: 'user1', baseCurrencyId: 'usd' };
      
      const result = await service.create(dto as any);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.household.create).toHaveBeenCalledWith({
        data: { name: 'My Home', mode: 'couple', baseCurrencyId: 'usd' },
      });
      expect(prisma.householdMember.create).toHaveBeenCalledWith({
        data: { householdId: 'hh1', userId: 'user1', role: 'owner' },
      });
      expect(result).toEqual({ id: 'hh1' });
    });
  });

  describe('findAll', () => {
    it('should return all households', async () => {
      mockPrismaService.household.findMany.mockResolvedValue(['hh1']);
      const result = await service.findAll();
      expect(prisma.household.findMany).toHaveBeenCalled();
      expect(result).toEqual(['hh1']);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.household.findFirst.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should return household if found', async () => {
      mockPrismaService.household.findFirst.mockResolvedValue({ id: 'hh1' });
      const result = await service.findOne('hh1');
      expect(result).toEqual({ id: 'hh1' });
    });
  });

  describe('update', () => {
    it('should update if found', async () => {
      mockPrismaService.household.findFirst.mockResolvedValue({ id: 'hh1' });
      mockPrismaService.household.update.mockResolvedValue('updated');
      const result = await service.update('hh1', { name: 'NewName' });
      expect(prisma.household.update).toHaveBeenCalledWith({
        where: { id: 'hh1' },
        data: { name: 'NewName' },
      });
      expect(result).toBe('updated');
    });
  });

  describe('remove', () => {
    it('should soft delete if found', async () => {
      mockPrismaService.household.findFirst.mockResolvedValue({ id: 'hh1' });
      mockPrismaService.household.update.mockResolvedValue('removed');
      const result = await service.remove('hh1');
      expect(prisma.household.update).toHaveBeenCalledWith({
        where: { id: 'hh1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toBe('removed');
    });
  });

  describe('generateInvite', () => {
    it('should throw BadRequestException if mode is not couple', async () => {
      mockPrismaService.household.findFirst.mockResolvedValue({ id: 'hh1', mode: 'single' });
      await expect(service.generateInvite('hh1')).rejects.toThrow(BadRequestException);
    });

    it('should generate invite code and expiration if mode is couple', async () => {
      mockPrismaService.household.findFirst.mockResolvedValue({ id: 'hh1', mode: 'couple' });
      mockPrismaService.household.update.mockResolvedValue('invited');
      const result = await service.generateInvite('hh1');
      expect(prisma.household.update).toHaveBeenCalledWith({
        where: { id: 'hh1' },
        data: {
          inviteCode: expect.any(String),
          inviteExpiresAt: expect.any(Date),
        },
      });
      expect(result).toBe('invited');
    });
  });

  describe('join', () => {
    it('should throw BadRequestException if invite is invalid or expired', async () => {
      mockPrismaService.household.findFirst.mockResolvedValue(null);
      await expect(service.join({ inviteCode: 'code', userId: 'user2' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if household is full', async () => {
      mockPrismaService.household.findFirst.mockResolvedValue({ id: 'hh1', members: [{}, {}] });
      await expect(service.join({ inviteCode: 'code', userId: 'user2' })).rejects.toThrow(BadRequestException);
    });

    it('should add member and clear invite code in transaction', async () => {
      mockPrismaService.household.findFirst.mockResolvedValue({ id: 'hh1', members: [{}] });
      mockPrismaService.householdMember.create.mockResolvedValue('member');
      const result = await service.join({ inviteCode: 'code', userId: 'user2' });
      
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.householdMember.create).toHaveBeenCalledWith({
        data: { householdId: 'hh1', userId: 'user2', role: 'member' },
      });
      expect(prisma.household.update).toHaveBeenCalledWith({
        where: { id: 'hh1' },
        data: { inviteCode: null, inviteExpiresAt: null },
      });
      expect(result).toBe('member');
    });
  });
});
