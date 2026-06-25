import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { AiJobsService } from './ai-jobs.service';
import { CreateAiJobDto } from './dto/create-ai-job.dto';
import { UpdateAiJobDto } from './dto/update-ai-job.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('ai-jobs')
@Controller('households/:householdId/ai-jobs')
export class AiJobsController {
  constructor(private readonly aiJobsService: AiJobsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create an AI job' })
  create(
    @Param('householdId') householdId: string,
    @Body() createAiJobDto: CreateAiJobDto,
  ) {
    return this.aiJobsService.create(householdId, createAiJobDto);
  }

  @Get()
  @ApiOperation({ summary: 'List AI jobs' })
  findAll(@Param('householdId') householdId: string) {
    return this.aiJobsService.findAll(householdId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI job details' })
  findOne(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.aiJobsService.findOne(householdId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an AI job status or result' })
  update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() updateAiJobDto: UpdateAiJobDto,
  ) {
    return this.aiJobsService.update(householdId, id, updateAiJobDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an AI job' })
  remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.aiJobsService.remove(householdId, id);
  }
}
