import { IsEnum, IsNotEmpty, IsNumber, IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BudgetPeriodType } from '@prisma/client';

export class CreateBudgetDto {
  @ApiProperty({ description: 'UUID of the category' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'Name of the budget' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Amount limit for the budget' })
  @IsNumber()
  amountLimit: number;

  @ApiProperty({ enum: BudgetPeriodType })
  @IsEnum(BudgetPeriodType)
  periodType: BudgetPeriodType;

  @ApiProperty({ description: 'Start date of the budget' })
  @IsString()
  @IsNotEmpty()
  startDate: string;
}
