// backend/src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationType, Notification } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RankingGateway } from '../ranking/ranking.gateway';
import { PaginationQueryDto, paginate } from '../common/dto/pagination-query.dto';

const STATUS_LABEL: Record<string, string> = {
  approved: 'aprobado', delivered: 'entregado', cancelled: 'cancelado', pending: 'pendiente',
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private gateway: RankingGateway) {}

  buildNotificationContent(
    type: NotificationType,
    data: any,
  ): { title: string; message: string; link?: string } {
    switch (type) {
      case 'level_up':
        return { title: '¡Subiste de nivel!', message: `Alcanzaste el nivel ${data.level}. ¡Sigue así!`, link: '/student/profile' };
      case 'achievement':
        return { title: 'Logro desbloqueado', message: `Desbloqueaste: ${data.name}`, link: '/student/achievements' };
      case 'reward_status':
        return { title: 'Actualización de canje', message: `Tu canje de "${data.rewardName}" fue ${STATUS_LABEL[data.status] ?? data.status}`, link: '/student/rewards' };
      case 'reward_pending':
        return { title: 'Canje pendiente', message: `${data.studentName} canjeó "${data.rewardName}" y espera tu aprobación`, link: '/teacher/rewards' };
      default:
        // Fallback exhaustivo: un tipo futuro no produce un payload undefined.
        return { title: 'Notificación', message: 'Tienes una nueva notificación' };
    }
  }

  async create(
    userId: string,
    input: { type: NotificationType; title: string; message: string; link?: string },
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: { userId, type: input.type, title: input.title, message: input.message, link: input.link },
    });
    // Emisión best-effort: un fallo del socket no rompe la creación.
    try {
      this.gateway.emitToUser(userId, 'notification:new', notification);
    } catch {
      /* ignore */
    }
    return notification;
  }

  list(userId: string, pagination: PaginationQueryDto = {}) {
    return paginate(
      this.prisma.notification,
      { where: { userId }, orderBy: { createdAt: 'desc' } },
      pagination,
    );
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
}
