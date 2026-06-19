// backend/src/notifications/notifications.service.spec.ts
import { NotificationsService } from './notifications.service';

describe('NotificationsService.buildNotificationContent', () => {
  let svc: NotificationsService;
  beforeEach(() => { svc = new NotificationsService({} as any, {} as any); });

  it('level_up', () => {
    expect(svc.buildNotificationContent('level_up', { level: 7 })).toEqual({
      title: '¡Subiste de nivel!',
      message: 'Alcanzaste el nivel 7. ¡Sigue así!',
      link: '/student/profile',
    });
  });

  it('achievement', () => {
    expect(svc.buildNotificationContent('achievement', { name: 'Maestro de Misiones' })).toEqual({
      title: 'Logro desbloqueado',
      message: 'Desbloqueaste: Maestro de Misiones',
      link: '/student/achievements',
    });
  });

  it('reward_status', () => {
    expect(svc.buildNotificationContent('reward_status', { rewardName: 'Insignia', status: 'approved' })).toEqual({
      title: 'Actualización de canje',
      message: 'Tu canje de "Insignia" fue aprobado',
      link: '/student/rewards',
    });
  });

  it('reward_pending', () => {
    expect(svc.buildNotificationContent('reward_pending', { studentName: 'Ana', rewardName: 'Insignia' })).toEqual({
      title: 'Canje pendiente',
      message: 'Ana canjeó "Insignia" y espera tu aprobación',
      link: '/teacher/rewards',
    });
  });
});
