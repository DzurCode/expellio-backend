import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    category: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      updateMany: jest.fn(),
    },
    recurringConfig: {
      updateMany: jest.fn(),
    },
    budget: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback) => {
      return callback(mockPrismaService);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category', async () => {
      mockPrismaService.category.create.mockResolvedValue('createdCategory');
      const dto = { name: 'Food', color: 'red', icon: 'burger', sortOrder: 1 };
      
      const result = await service.create('hh1', dto as any);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { ...dto, householdId: 'hh1' },
      });
      expect(result).toBe('createdCategory');
    });
  });

  describe('findAll', () => {
    it('should return all categories for a household including system', async () => {
      mockPrismaService.category.findMany.mockResolvedValue(['cat1']);
      const result = await service.findAll('hh1');
      expect(prisma.category.findMany).toHaveBeenCalled();
      expect(result).toEqual(['cat1']);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      await expect(service.findOne('hh1', 'invalid')).rejects.toThrow(NotFoundException);
    });

    it('should return category if found', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue({ id: 'cat1' });
      const result = await service.findOne('hh1', 'cat1');
      expect(result).toEqual({ id: 'cat1' });
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if category is system', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue({ id: 'cat1', isSystem: true });
      await expect(service.update('hh1', 'cat1', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should update if valid', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue({ id: 'cat1', isSystem: false });
      mockPrismaService.category.update.mockResolvedValue('updated');
      const result = await service.update('hh1', 'cat1', { name: 'NewName' } as any);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat1' },
        data: { name: 'NewName' },
      });
      expect(result).toBe('updated');
    });
  });

  describe('replaceAndRemove', () => {
    it('should throw BadRequestException if original category is system', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValueOnce({ id: 'cat1', isSystem: true } as any);
      await expect(service.replaceAndRemove('hh1', 'cat1', { replacementCategoryId: 'cat2' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if replacement is same as original', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValueOnce({ id: 'cat1', isSystem: false } as any)
                                    .mockResolvedValueOnce({ id: 'cat1', isSystem: false } as any);
      await expect(service.replaceAndRemove('hh1', 'cat1', { replacementCategoryId: 'cat1' })).rejects.toThrow(BadRequestException);
    });

    it('should replace and soft delete within a transaction', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValueOnce({ id: 'cat1', isSystem: false } as any)
                                    .mockResolvedValueOnce({ id: 'cat2', isSystem: false } as any);
      
      mockPrismaService.category.update.mockResolvedValue('deletedCategory');

      const result = await service.replaceAndRemove('hh1', 'cat1', { replacementCategoryId: 'cat2' });
      
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.transaction.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { categoryId: 'cat2' }
      }));
      expect(mockPrismaService.recurringConfig.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { categoryId: 'cat2' }
      }));
      expect(mockPrismaService.budget.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { categoryId: 'cat2' }
      }));
      expect(mockPrismaService.category.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { deletedAt: expect.any(Date) }
      }));
      expect(result).toBe('deletedCategory');
    });
  });
});
