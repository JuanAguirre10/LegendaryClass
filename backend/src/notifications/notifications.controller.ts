// backend/src/notifications/notifications.controller.ts
import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: { id: string }, @Query() pagination: PaginationQueryDto) {
    return this.notifications.list(user.id, pagination);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: { id: string }) {
    return this.notifications.unreadCount(user.id);
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.notifications.markRead(id, user.id);
    return { message: 'ok' };
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: { id: string }) {
    await this.notifications.markAllRead(user.id);
    return { message: 'ok' };
  }
}
