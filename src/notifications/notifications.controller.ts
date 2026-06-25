import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('users/me/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a notification' })
  create(
    @CurrentUser() user: { id: string },
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(user.id, createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'List notifications for user' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.notificationsService.findAllByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification details' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update notification (e.g. mark as read)' })
  update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, updateNotificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a notification' })
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}
