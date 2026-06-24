import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplaceCategoryDto {
  @ApiProperty({ description: 'UUID of the category to replace with' })
  @IsUUID()
  @IsNotEmpty()
  replacementCategoryId: string;
}
