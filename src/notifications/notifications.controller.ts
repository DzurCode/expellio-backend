import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('users/:userId/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a notification' })
  create(
    @Param('userId') userId: string,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    // Ensures userId from path is set
    createNotificationDto.userId = userId;
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for user' })
  findAll(@Param('userId') userId: string) {
    return this.notificationsService.findAllByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification details' })
  findOne(
    @Param('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update notification (e.g. mark as read)' })
  update(
    @Param('userId') userId: string,
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a notification' })
  remove(
    @Param('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.remove(id);
  }
}
