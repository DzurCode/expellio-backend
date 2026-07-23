import { Controller, Get, Param, Delete, HttpCode } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('users/me/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all notifications for the authenticated user' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.notificationsService.findAllByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single notification (ownership enforced)' })
  @ApiResponse({ status: 404, description: 'Notification not found or does not belong to user' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.findOne(id, user.id);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete (dismiss) all notifications for the authenticated user' })
  deleteAll(@CurrentUser() user: { id: string }) {
    return this.notificationsService.deleteAll(user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete (dismiss) a single notification (ownership enforced)' })
  @ApiResponse({ status: 404, description: 'Notification not found or does not belong to user' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationsService.remove(id, user.id);
  }
}
