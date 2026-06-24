import { Test, TestingModule } from '@nestjs/testing';
import { CurrenciesService } from './currencies.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CurrenciesService', () => {
  let service: CurrenciesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    currency: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrenciesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CurrenciesService>(CurrenciesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a currency', async () => {
      mockPrismaService.currency.create.mockResolvedValue('createdCurrency');
      const dto = { code: 'USD', symbol: '$', name: 'US Dollar', isActive: true };
      
      const result = await service.create(dto as any);
      expect(prisma.currency.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toBe('createdCurrency');
    });
  });

  describe('findAll', () => {
    it('should return all active currencies', async () => {
      mockPrismaService.currency.findMany.mockResolvedValue(['cur1']);
      const result = await service.findAll();
      expect(prisma.currency.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, isActive: true },
      });
      expect(result).toEqual(['cur1']);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.currency.findFirst.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should return currency if found', async () => {
      mockPrismaService.currency.findFirst.mockResolvedValue({ id: 'cur1' });
      const result = await service.findOne('cur1');
      expect(result).toEqual({ id: 'cur1' });
    });
  });

  describe('update', () => {
    it('should update if found', async () => {
      mockPrismaService.currency.findFirst.mockResolvedValue({ id: 'cur1' });
      mockPrismaService.currency.update.mockResolvedValue('updated');
      const result = await service.update('cur1', { name: 'NewName' });
      expect(prisma.currency.update).toHaveBeenCalledWith({
        where: { id: 'cur1' },
        data: { name: 'NewName' },
      });
      expect(result).toBe('updated');
    });
  });

  describe('remove', () => {
    it('should soft delete if found', async () => {
      mockPrismaService.currency.findFirst.mockResolvedValue({ id: 'cur1' });
      mockPrismaService.currency.update.mockResolvedValue('removed');
      const result = await service.remove('cur1');
      expect(prisma.currency.update).toHaveBeenCalledWith({
        where: { id: 'cur1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toBe('removed');
    });
  });
});
