import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { HouseholdMode } from '@prisma/client';

export class CreateHouseholdDto {
  @ApiProperty({ example: "Daniel's Finances" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: HouseholdMode, example: HouseholdMode.individual })
  @IsEnum(HouseholdMode)
  mode: HouseholdMode;

  @ApiProperty({ description: 'UUID of the currency' })
  @IsUUID()
  currencyId: string;

  @ApiProperty({ description: 'UUID of the user creating this household' })
  @IsUUID()
  ownerId: string;
}
