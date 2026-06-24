import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReplaceCategoryDto } from './dto/replace-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(householdId: string, createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        householdId, // NULL if system category (handled differently, but supported by schema)
      },
    });
  }

  async findAll(householdId: string) {
    // Return both household-specific categories and system defaults
    return this.prisma.category.findMany({
      where: {
        OR: [
          { householdId, deletedAt: null },
          { householdId: null, isSystem: true, deletedAt: null },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(householdId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        OR: [{ householdId }, { householdId: null, isSystem: true }],
        deletedAt: null,
      },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(householdId: string, id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(householdId, id);
    if (category.isSystem) {
      throw new BadRequestException('System categories cannot be updated');
    }
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async replaceAndRemove(householdId: string, id: string, replaceCategoryDto: ReplaceCategoryDto) {
    const originalCategory = await this.findOne(householdId, id);
    if (originalCategory.isSystem) {
      throw new BadRequestException('System categories cannot be deleted');
    }

    const replacementCategory = await this.findOne(householdId, replaceCategoryDto.replacementCategoryId);
    if (originalCategory.id === replacementCategory.id) {
      throw new BadRequestException('Replacement category must be different from original');
    }

    // Reassign all linked transactions and budgets, then soft-delete
    return this.prisma.$transaction(async (tx) => {
      // Reassign transactions
      await tx.transaction.updateMany({
        where: { categoryId: originalCategory.id, deletedAt: null },
        data: { categoryId: replacementCategory.id },
      });

      // Reassign recurring configs
      await tx.recurringConfig.updateMany({
        where: { categoryId: originalCategory.id, deletedAt: null },
        data: { categoryId: replacementCategory.id },
      });

      // Reassign budgets
      await tx.budget.updateMany({
        where: { categoryId: originalCategory.id, deletedAt: null },
        data: { categoryId: replacementCategory.id },
      });

      // Soft delete category
      return tx.category.update({
        where: { id: originalCategory.id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
