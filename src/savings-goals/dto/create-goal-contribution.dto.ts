import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoalContributionDto {
  @ApiProperty({ description: 'Amount contributed (positive for deposit, negative for withdrawal)' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ description: 'Optional description or note for the contribution' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiPropertyOptional({ description: 'Date when the contribution was made (ISO format)' })
  @IsOptional()
  @IsDateString()
  contributedAt?: string;
}
