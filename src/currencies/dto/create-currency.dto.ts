import { IsBoolean, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'USD', description: 'ISO 4217 currency code' })
  @IsString()
  @Length(3, 3)
  code: string;

  @ApiProperty({ example: 'US Dollar' })
  @IsString()
  name: string;

  @ApiProperty({ example: '$' })
  @IsString()
  symbol: string;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  decimalPlaces?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
