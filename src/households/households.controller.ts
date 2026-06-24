import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('households')
@Controller('households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a household' })
  create(@Body() createHouseholdDto: CreateHouseholdDto) {
    return this.householdsService.create(createHouseholdDto);
  }

  @Get()
  @ApiOperation({ summary: 'List households' })
  findAll() {
    return this.householdsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get household details' })
  findOne(@Param('id') id: string) {
    return this.householdsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update household' })
  update(@Param('id') id: string, @Body() updateHouseholdDto: UpdateHouseholdDto) {
    return this.householdsService.update(id, updateHouseholdDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete household' })
  remove(@Param('id') id: string) {
    return this.householdsService.remove(id);
  }

  @Post(':id/invite')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate invite code for partner (couple mode only)' })
  generateInvite(@Param('id') id: string) {
    return this.householdsService.generateInvite(id);
  }

  @Post('join')
  @HttpCode(200)
  @ApiOperation({ summary: 'Join a household using an invite code' })
  join(@Body() joinHouseholdDto: JoinHouseholdDto) {
    return this.householdsService.join(joinHouseholdDto);
  }
}
