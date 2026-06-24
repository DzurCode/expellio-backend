import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { SavingsGoalsService } from './savings-goals.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('savings-goals')
@Controller('households/:householdId/savings-goals')
export class SavingsGoalsController {
  constructor(private readonly savingsGoalsService: SavingsGoalsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a savings goal' })
  create(
    @Param('householdId') householdId: string,
    @Body() createSavingsGoalDto: CreateSavingsGoalDto,
  ) {
    return this.savingsGoalsService.create(householdId, createSavingsGoalDto);
  }

  @Get()
  @ApiOperation({ summary: 'List savings goals' })
  findAll(@Param('householdId') householdId: string) {
    return this.savingsGoalsService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get savings goal details' })
  findOne(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.savingsGoalsService.findOne(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a savings goal' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() updateSavingsGoalDto: UpdateSavingsGoalDto,
  ) {
    return this.savingsGoalsService.update(householdId, id, updateSavingsGoalDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a savings goal' })
  remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.savingsGoalsService.remove(householdId, id);
  }
}
