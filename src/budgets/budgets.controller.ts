import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('budgets')
@Controller('households/:householdId/budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a budget' })
  create(
    @Param('householdId') householdId: string,
    @Body() createBudgetDto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(householdId, createBudgetDto);
  }

  @Get()
  @ApiOperation({ summary: 'List budgets' })
  findAll(@Param('householdId') householdId: string) {
    return this.budgetsService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget details' })
  findOne(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.budgetsService.findOne(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(householdId, id, updateBudgetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a budget' })
  remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.budgetsService.remove(householdId, id);
  }
}
