import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReplaceCategoryDto } from './dto/replace-category.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(householdId: string, createCategoryDto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          ...createCategoryDto,
          householdId, // NULL if system category (handled differently, but supported by schema)
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Duplicate category');
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async findAll(householdId: string) {
    try {
      // Return both household-specific categories and system defaults
      return await this.prisma.category.findMany({
        where: {
          OR: [
            { householdId, deletedAt: null },
            { householdId: null, isSystem: true, deletedAt: null },
          ],
        },
        orderBy: { sortOrder: 'asc' },
      });
    } catch (error) {
      throw new InternalServerErrorException('Database error');
    }
  }

  async findOne(householdId: string, id: string) {
    try {
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
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  async update(householdId: string, id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      const category = await this.findOne(householdId, id);
      if (category.isSystem) {
        throw new BadRequestException('System categories cannot be updated');
      }
      return await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('Duplicate category');
        if (error.code === 'P2025') throw new NotFoundException(`Category with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }

  async replaceAndRemove(householdId: string, id: string, replaceCategoryDto: ReplaceCategoryDto) {
    try {
      const originalCategory = await this.findOne(householdId, id);
      if (originalCategory.isSystem) {
        throw new BadRequestException('System categories cannot be deleted');
      }

      const replacementCategory = await this.findOne(householdId, replaceCategoryDto.replacementCategoryId);
      if (originalCategory.id === replacementCategory.id) {
        throw new BadRequestException('Replacement category must be different from original');
      }

      // Reassign all linked transactions and budgets, then soft-delete
      return await this.prisma.$transaction(async (tx) => {
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
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
         throw new NotFoundException(`Category not found`);
      }
      throw new InternalServerErrorException('Database error');
    }
  }
}
