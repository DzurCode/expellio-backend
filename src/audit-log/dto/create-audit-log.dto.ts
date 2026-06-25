import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';

export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: 'Tenant context' })
  @IsOptional()
  @IsUUID()
  householdId?: string;

  @ApiProperty({ description: 'UUID of the user who performed the action' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: AuditAction })
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({ description: 'Table name: transactions, budgets, etc.' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ description: 'PK of the affected record' })
  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ description: 'Changes object diff' })
  @IsObject()
  @IsNotEmpty()
  changes: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userAgent?: string;
}
