import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SavingsGoalStatus } from '@prisma/client';

export class CreateSavingsGoalDto {
  @ApiProperty({ description: 'Name of the savings goal' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Target amount to save' })
  @IsNumber()
  targetAmount: number;

  @ApiPropertyOptional({ description: 'Current amount saved', default: 0 })
  @IsOptional()
  @IsNumber()
  currentAmount?: number;

  @ApiPropertyOptional({ description: 'Target date to achieve the goal' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Description of the savings goal' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Emoji icon identifier' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Hex color code' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: SavingsGoalStatus, default: SavingsGoalStatus.active })
  @IsOptional()
  @IsEnum(SavingsGoalStatus)
  status?: SavingsGoalStatus = SavingsGoalStatus.active;
}
