import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-features-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './features-page.component.html',
})
export class FeaturesPageComponent {
  features = [
    { icon: '🎮', title: 'Gamificación Total',      desc: 'XP, niveles, rangos y progresión constante que mantiene a los estudiantes siempre motivados a participar.', color: 'text-amber-600', bg: 'bg-amber-50',  border: 'border-amber-200'  },
    { icon: '⚔️', title: 'Clases de Personaje',    desc: '5 clases únicas con bonificaciones especiales: Guerrero, Mago, Arquero, Paladín y Pícaro.', color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
    { icon: '🗡️', title: 'Sistema de Misiones',    desc: 'Diseña misiones académicas con XP. Tareas, participación y comportamiento se convierten en aventuras.', color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
    { icon: '🏆', title: 'Logros y Medallas',       desc: '+50 logros desbloqueables que reconocen esfuerzo, puntualidad, creatividad y excelencia académica.', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { icon: '🛒', title: 'Tienda de Recompensas',  desc: 'Los estudiantes canjean sus puntos por premios reales: tiempo libre, stickers, privilegios y más.', color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-200'   },
    { icon: '📊', title: 'Analytics en Tiempo Real',desc: 'Reportes detallados para directores y maestros. Progreso individual y colectivo en tiempo real.', color: 'text-cyan-600',   bg: 'bg-cyan-50',   border: 'border-cyan-200'   },
    { icon: '👨‍👩‍👧', title: 'Portal de Padres',     desc: 'Los padres monitorean el progreso, logros y actividad de sus hijos en tiempo real desde cualquier dispositivo.', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { icon: '🏛️', title: 'Gestión Institucional',  desc: 'Panel de director completo: administra maestros, aulas y visualiza estadísticas de toda la institución.', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    { icon: '🔔', title: 'Notificaciones',          desc: 'Alertas instantáneas cuando los estudiantes suben de nivel, ganan logros o canjean recompensas.', color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-200'   },
  ];
}
