import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { RecurringConfigsService } from './recurring-configs.service';
import { CreateRecurringConfigDto } from './dto/create-recurring-config.dto';
import { UpdateRecurringConfigDto } from './dto/update-recurring-config.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('recurring-configs')
@Controller('households/:householdId/recurring-configs')
export class RecurringConfigsController {
  constructor(private readonly recurringConfigsService: RecurringConfigsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a recurring configuration' })
  create(
    @Param('householdId') householdId: string,
    @Body() createRecurringConfigDto: CreateRecurringConfigDto,
  ) {
    return this.recurringConfigsService.create(householdId, createRecurringConfigDto);
  }

  @Get()
  @ApiOperation({ summary: 'List recurring configurations' })
  findAll(@Param('householdId') householdId: string) {
    return this.recurringConfigsService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recurring configuration' })
  findOne(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.recurringConfigsService.findOne(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring configuration (cascades to future transactions)' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() updateRecurringConfigDto: UpdateRecurringConfigDto,
  ) {
    return this.recurringConfigsService.update(householdId, id, updateRecurringConfigDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a recurring configuration' })
  remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.recurringConfigsService.remove(householdId, id);
  }
}
