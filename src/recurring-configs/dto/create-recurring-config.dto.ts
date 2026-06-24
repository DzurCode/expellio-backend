import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurringFrequency, TransactionType } from '@prisma/client';

export class CreateRecurringConfigDto {
  @ApiProperty({ description: 'UUID of the category' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: 'UUID of the user (who this belongs to)' })
  @IsUUID()
  createdByUserId: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Amount to be generated' })
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: RecurringFrequency })
  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  @ApiProperty({ description: 'Start date of the recurrence' })
  @IsDateString()
  fromDate: string;

  @ApiPropertyOptional({ description: 'End date of the recurrence (if it ends)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Total number of occurrences allowed (if limited)', default: 0 })
  @IsOptional()
  @IsNumber()
  totalOccurrences?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
