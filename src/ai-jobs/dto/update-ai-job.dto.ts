import { PartialType } from '@nestjs/swagger';
import { CreateAiJobDto } from './create-ai-job.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AiJobStatus } from '@prisma/client';

export class UpdateAiJobDto extends PartialType(CreateAiJobDto) {
  @ApiPropertyOptional({ enum: AiJobStatus })
  @IsOptional()
  @IsEnum(AiJobStatus)
  status?: AiJobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
