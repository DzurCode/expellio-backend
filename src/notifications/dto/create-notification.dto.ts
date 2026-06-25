import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {

  @ApiPropertyOptional({ description: 'Context UUID if related to a household' })
  @IsOptional()
  @IsUUID()
  householdId?: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification body content' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ description: 'Optional deep link' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Related entity type (budget, goal, etc)' })
  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @ApiPropertyOptional({ description: 'Related entity UUID' })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;
}
