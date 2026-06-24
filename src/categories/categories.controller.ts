import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReplaceCategoryDto } from './dto/replace-category.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('categories')
@Controller('households/:householdId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a category' })
  create(
    @Param('householdId') householdId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(householdId, createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'List categories (including system defaults)' })
  findAll(@Param('householdId') householdId: string) {
    return this.categoriesService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category details' })
  findOne(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.findOne(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update custom category' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(householdId, id, updateCategoryDto);
  }

  @Post(':id/replace-and-remove')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reassign transactions/budgets to a new category and soft-delete this one' })
  replaceAndRemove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() replaceCategoryDto: ReplaceCategoryDto,
  ) {
    return this.categoriesService.replaceAndRemove(householdId, id, replaceCategoryDto);
  }
}
