import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

type Role = 'student' | 'teacher' | 'director' | 'parent';

@Component({
  selector: 'app-how-it-works-page',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './how-it-works-page.component.html',
})
export class HowItWorksPageComponent {
  activeRole = signal<Role>('student');
  roleTabs: Role[] = ['student', 'teacher', 'director', 'parent'];

  setRole(r: string) { this.activeRole.set(r as Role); }

  roleData: Record<Role, { label: string; icon: string; tabColor: string; steps: { icon: string; title: string; desc: string }[] }> = {
    student: {
      label: 'Estudiante', icon: '⚔️',
      tabColor: 'border-blue-400 text-blue-700 bg-blue-50',
      steps: [
        { icon: '📝', title: 'Regístrate Gratis',  desc: 'Crea tu cuenta en menos de 2 minutos, sin tarjeta de crédito.' },
        { icon: '⚔️', title: 'Elige tu Héroe',    desc: 'Selecciona una de las 5 clases únicas con bonificaciones especiales.' },
        { icon: '🗡️', title: 'Completa Misiones',  desc: 'Realiza las misiones del maestro, gana XP y sube de nivel.' },
        { icon: '🏆', title: 'Domina el Aula',     desc: 'Sube al ranking, desbloquea logros épicos y canjea recompensas.' },
      ],
    },
    teacher: {
      label: 'Maestro', icon: '🧙‍♂️',
      tabColor: 'border-green-400 text-green-700 bg-green-50',
      steps: [
        { icon: '🏫', title: 'Crea tu Aula',        desc: 'Configura tu clase en minutos con código único para estudiantes.' },
        { icon: '📋', title: 'Diseña Misiones',     desc: 'Crea misiones y comportamientos con recompensas de XP.' },
        { icon: '⭐', title: 'Premia en Tiempo Real',desc: 'Otorga puntos y logros con un clic durante la clase.' },
        { icon: '📊', title: 'Mide el Progreso',    desc: 'Estadísticas completas del desempeño individual y colectivo.' },
      ],
    },
    director: {
      label: 'Director', icon: '👑',
      tabColor: 'border-purple-400 text-purple-700 bg-purple-50',
      steps: [
        { icon: '🏛️', title: 'Registra tu Institución', desc: 'Crea la cuenta de tu colegio e invita a tus docentes.' },
        { icon: '🏫', title: 'Supervisa Aulas',           desc: 'Monitorea todas las clases y actividad en tiempo real.' },
        { icon: '📈', title: 'Reportes Globales',          desc: 'Analytics completos: rendimiento, comportamientos, participación.' },
        { icon: '🎁', title: 'Política de Premios',       desc: 'Define parámetros globales de gamificación institucional.' },
      ],
    },
    parent: {
      label: 'Padre/Tutor', icon: '🛡️',
      tabColor: 'border-amber-400 text-amber-700 bg-amber-50',
      steps: [
        { icon: '👤', title: 'Crea tu Perfil',    desc: 'Regístrate como padre o tutor con tu correo en 2 minutos.' },
        { icon: '🔗', title: 'Vincula a tu Hijo', desc: 'Conecta con la cuenta de tu hijo usando un código de vinculación.' },
        { icon: '📱', title: 'Sigue su Progreso', desc: 'Ve nivel, personaje, XP y logros en tiempo real.' },
        { icon: '🏆', title: 'Celebra Juntos',    desc: 'Recibe notificaciones cuando tu hijo sube de nivel o gana logros.' },
      ],
    },
  };
}
