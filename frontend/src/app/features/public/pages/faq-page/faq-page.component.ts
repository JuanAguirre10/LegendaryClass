import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './faq-page.component.html',
})
export class FaqPageComponent {
  openFaq = signal<number | null>(null);

  toggle(i: number) { this.openFaq.set(this.openFaq() === i ? null : i); }

  faqs = [
    { cat: '🎮 General',
      q: '¿Qué es LegendaryClass?',
      a: 'LegendaryClass es una plataforma de gamificación educativa que transforma el aula en una aventura de RPG. Los estudiantes ganan XP, eligen personajes heroicos, completan misiones académicas y canjean recompensas reales.' },
    { cat: '🏫 Para Maestros',
      q: '¿Cómo creo mi primera aula?',
      a: 'Regístrate como maestro, accede a tu dashboard y haz clic en "Nueva Aula". En menos de 5 minutos tendrás tu aula lista con un código único para compartir con tus estudiantes.' },
    { cat: '⚔️ Para Estudiantes',
      q: '¿Cómo se unen los estudiantes a un aula?',
      a: 'El maestro comparte un código único. Los estudiantes se registran en la plataforma, van a "Unirse a Aula" e ingresan ese código. El proceso toma menos de 2 minutos.' },
    { cat: '🔒 Seguridad',
      q: '¿Es seguro para niños y adolescentes?',
      a: 'Absolutamente. No recopilamos datos sensibles, los padres pueden monitorear toda la actividad, y el entorno está moderado por los docentes. Cumplimos estándares estrictos de privacidad.' },
    { cat: '🛒 Recompensas',
      q: '¿Puedo personalizar las recompensas de mi aula?',
      a: 'Sí, totalmente. Cada maestro define su propia tienda con premios como tiempo libre, stickers, actividades especiales u otros incentivos que tú determines.' },
    { cat: '💳 Planes',
      q: '¿Hay período de prueba en los planes de pago?',
      a: 'Sí, 14 días de prueba gratuita en el plan Aventurero. No necesitas tarjeta de crédito. Al finalizar puedes continuar o quedarte en el plan Explorador gratuito.' },
    { cat: '📱 Dispositivos',
      q: '¿LegendaryClass funciona en móviles?',
      a: 'Sí. La plataforma está optimizada para móviles, tablets y computadoras. Los estudiantes pueden acceder y completar misiones desde cualquier dispositivo con internet.' },
    { cat: '👨‍👩‍👧 Para Padres',
      q: '¿Cómo vinculo la cuenta de mi hijo?',
      a: 'Regístrate como padre/tutor, luego ve a "Vincular Hijo" e ingresa el código de vinculación que te proporciona tu hijo o el maestro. En segundos estarás conectado.' },
    { cat: '🏛️ Para Instituciones',
      q: '¿Puedo usar LegendaryClass en toda mi institución?',
      a: 'Sí, el plan Legendario está diseñado exactamente para eso. Incluye panel de director, gestión de todos los maestros, reportes institucionales y soporte dedicado.' },
    { cat: '⚙️ Técnico',
      q: '¿Necesito instalar algo?',
      a: 'No. LegendaryClass es 100% web. Solo necesitas un navegador moderno (Chrome, Firefox, Safari, Edge) y conexión a internet. Sin descargas ni instalaciones.' },
  ];
}
