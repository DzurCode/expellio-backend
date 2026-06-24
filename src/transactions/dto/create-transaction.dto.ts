import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType, TransactionSource } from '@prisma/client';

export class TransactionSplitDto {
  @ApiProperty({ description: 'UUID of the user' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Exact amount to split' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Percentage of the total amount' })
  @IsOptional()
  @IsNumber()
  percentage?: number;
}

export class CreateTransactionDto {
  @ApiProperty({ description: 'UUID of the user creating the transaction' })
  @IsUUID()
  createdByUserId: string;
  @ApiProperty({ description: 'UUID of the category' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Amount in household currency' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Date of the transaction' })
  @IsDateString()
  transactionDate: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TransactionSource, default: TransactionSource.manual })
  @IsOptional()
  @IsEnum(TransactionSource)
  source?: TransactionSource = TransactionSource.manual;

  @ApiPropertyOptional({ description: 'UUID of the user who paid (if applicable)' })
  @IsOptional()
  @IsUUID()
  paidById?: string;

  @ApiPropertyOptional({ description: 'UUID of the recurring config if generated' })
  @IsOptional()
  @IsUUID()
  recurringConfigId?: string;

  @ApiPropertyOptional({ type: [TransactionSplitDto], description: 'Optional split details' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionSplitDto)
  splits?: TransactionSplitDto[];
}
