import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiJobType, AiJobStatus } from '@prisma/client';

export class CreateAiJobDto {
  @ApiProperty({ description: 'UUID of the user who initiated the job' })
  @IsUUID()
  @IsNotEmpty()
  initiatedByUserId: string;

  @ApiProperty({ enum: AiJobType })
  @IsEnum(AiJobType)
  jobType: AiJobType;

  @ApiPropertyOptional({ description: 'What the user was trying to do' })
  @IsOptional()
  @IsString()
  userIntent?: string;
}
