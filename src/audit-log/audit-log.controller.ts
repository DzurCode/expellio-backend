import { Controller, Get, Post, Body, Param, HttpCode } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('audit-log')
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create an audit log entry (Append-only)' })
  create(@Body() createAuditLogDto: CreateAuditLogDto) {
    return this.auditLogService.create(createAuditLogDto);
  }

  @Get('households/:householdId')
  @ApiOperation({ summary: 'List audit logs for a household' })
  findAllByHousehold(@Param('householdId') householdId: string) {
    return this.auditLogService.findAllByHousehold(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log details' })
  findOne(@Param('id') id: string) {
    return this.auditLogService.findOne(id);
  }
}
