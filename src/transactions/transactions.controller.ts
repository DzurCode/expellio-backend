import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('transactions')
@Controller('households/:householdId/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a transaction' })
  create(
    @Param('householdId') householdId: string,
    @CurrentUser() user: { id: string },
    @Body() createTransactionDto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(householdId, user.id, createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions' })
  findAll(@Param('householdId') householdId: string) {
    return this.transactionsService.findAll(householdId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get household transaction summary statistics' })
  getSummary(@Param('householdId') householdId: string) {
    return this.transactionsService.getSummary(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details' })
  findOne(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.transactionsService.findOne(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(householdId, id, updateTransactionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a transaction' })
  remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.transactionsService.remove(householdId, id);
  }
}
