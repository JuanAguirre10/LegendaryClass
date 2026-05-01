import { AfterViewInit, Component, HostListener, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

type Role = 'student' | 'teacher' | 'director' | 'parent';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './home.component.html',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  scrolled = signal(false);
  activeSection = signal('inicio');
  activeRole = signal<Role>('student');
  openFaq = signal<number | null>(null);
  mobileMenuOpen = signal(false);
  showBackTop = signal(false);

  private observer!: IntersectionObserver;

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) this.activeSection.set(entry.target.id);
        });
      },
      { threshold: 0.35, rootMargin: '-64px 0px -45% 0px' },
    );
    ['inicio', 'stats', 'caracteristicas', 'como-funciona', 'personajes', 'precios', 'faq']
      .forEach(id => { const el = document.getElementById(id); if (el) this.observer.observe(el); });
  }

  ngOnDestroy() { this.observer?.disconnect(); }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 60);
    this.showBackTop.set(window.scrollY > 400);
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    this.mobileMenuOpen.set(false);
  }

  setRole(role: string) {
    this.activeRole.set(role as Role);
  }

  toggleFaq(i: number) {
    this.openFaq.set(this.openFaq() === i ? null : i);
  }

  navLinks = [
    { id: 'caracteristicas', label: 'Características' },
    { id: 'como-funciona', label: 'Cómo Funciona' },
    { id: 'personajes', label: 'Personajes' },
    { id: 'precios', label: 'Precios' },
    { id: 'faq', label: 'FAQ' },
  ];

  stats = [
    { icon: '🎓', value: '+5,000', label: 'Estudiantes Activos' },
    { icon: '🧙‍♂️', value: '+500', label: 'Maestros Registrados' },
    { icon: '🏫', value: '+200', label: 'Aulas Activas' },
    { icon: '⭐', value: '+100K', label: 'Misiones Completadas' },
  ];

  features = [
    { icon: '🎮', title: 'Gamificación Total', desc: 'Convierte el aula en una aventura épica con XP, niveles y rangos que mantienen a los estudiantes siempre motivados.', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { icon: '⚔️', title: 'Clases de Personaje', desc: '5 clases únicas con bonificaciones especiales: Guerrero, Mago, Arquero, Paladín y Pícaro. Cada estudiante elige su camino.', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { icon: '🗡️', title: 'Sistema de Misiones', desc: 'Los maestros diseñan misiones académicas con XP. Tareas, participación y comportamiento se convierten en aventuras épicas.', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    { icon: '🏆', title: 'Logros y Medallas', desc: 'Más de 50 logros desbloqueables que reconocen el esfuerzo, la puntualidad, la creatividad y la excelencia académica.', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { icon: '🛒', title: 'Tienda de Recompensas', desc: 'Los estudiantes canjean sus puntos por premios reales definidos por el maestro: stickers, privilegios y recompensas especiales.', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    { icon: '📊', title: 'Analytics en Tiempo Real', desc: 'Reportes detallados para directores y maestros. Visualiza el progreso individual y colectivo con datos claros y accionables.', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  ];

  roleTabs: Role[] = ['student', 'teacher', 'director', 'parent'];

  roleData: Record<Role, { label: string; icon: string; tabColor: string; steps: { icon: string; title: string; desc: string }[] }> = {
    student: {
      label: 'Estudiante', icon: '⚔️',
      tabColor: 'border-blue-400 text-blue-700 bg-blue-50',
      steps: [
        { icon: '📝', title: 'Regístrate Gratis', desc: 'Crea tu cuenta de estudiante en menos de 2 minutos. Sin tarjeta de crédito requerida.' },
        { icon: '⚔️', title: 'Elige tu Héroe', desc: 'Selecciona una de las 5 clases únicas con bonificaciones de XP especiales para ti.' },
        { icon: '🗡️', title: 'Completa Misiones', desc: 'El maestro crea misiones. Tú las completas, ganas XP y subes de nivel constantemente.' },
        { icon: '🏆', title: 'Domina el Aula', desc: 'Sube al top del ranking, desbloquea logros legendarios y canjea recompensas épicas.' },
      ],
    },
    teacher: {
      label: 'Maestro', icon: '🧙‍♂️',
      tabColor: 'border-green-400 text-green-700 bg-green-50',
      steps: [
        { icon: '🏫', title: 'Crea tu Aula', desc: 'Configura tu clase en minutos con un código único para que tus estudiantes se unan.' },
        { icon: '📋', title: 'Diseña Misiones', desc: 'Crea misiones y comportamientos con recompensas de XP personalizadas para tu curso.' },
        { icon: '⭐', title: 'Premia en Tiempo Real', desc: 'Otorga puntos, logros y recompensas a tus estudiantes con un solo clic durante clase.' },
        { icon: '📊', title: 'Mide el Progreso', desc: 'Estadísticas completas del desempeño individual y colectivo de tu aula en tiempo real.' },
      ],
    },
    director: {
      label: 'Director', icon: '👑',
      tabColor: 'border-purple-400 text-purple-700 bg-purple-50',
      steps: [
        { icon: '🏛️', title: 'Registra tu Institución', desc: 'Crea la cuenta de tu colegio e invita a todos tus docentes al sistema en minutos.' },
        { icon: '🏫', title: 'Supervisa Aulas', desc: 'Monitorea todas las clases activas, estudiantes y actividad académica en tiempo real.' },
        { icon: '📈', title: 'Reportes Institucionales', desc: 'Analytics completos de toda la institución: rendimiento, comportamientos y participación.' },
        { icon: '🎁', title: 'Política de Premios', desc: 'Define parámetros globales de gamificación y sistemas de recompensas institucionales.' },
      ],
    },
    parent: {
      label: 'Padre/Tutor', icon: '🛡️',
      tabColor: 'border-amber-400 text-amber-700 bg-amber-50',
      steps: [
        { icon: '👤', title: 'Crea tu Perfil', desc: 'Regístrate como padre o tutor con tu correo electrónico en menos de 2 minutos.' },
        { icon: '🔗', title: 'Vincula a tu Hijo', desc: 'Conecta con la cuenta de tu hijo usando un simple código de vinculación familiar.' },
        { icon: '📱', title: 'Sigue su Progreso', desc: 'Ve su nivel, personaje, XP y logros en tiempo real desde cualquier dispositivo.' },
        { icon: '🏆', title: 'Celebra Juntos', desc: 'Recibe notificaciones cuando tu hijo sube de nivel o gana un logro legendario.' },
      ],
    },
  };

  characters = [
    { name: 'Guerrero', icon: '⚔️', bonus: '+20% XP Participación', desc: 'Domina el campo de batalla con fuerza y determinación irresistible.', color: 'text-red-700', border: 'border-red-300', bg: 'bg-gradient-to-b from-red-50 to-rose-100' },
    { name: 'Mago', icon: '🔮', bonus: '+20% XP Tareas', desc: 'Canaliza el poder arcano para resolver los problemas más complejos.', color: 'text-blue-700', border: 'border-blue-300', bg: 'bg-gradient-to-b from-blue-50 to-indigo-100' },
    { name: 'Arquero', icon: '🏹', bonus: '+20% XP Puntualidad', desc: 'Precisión y disciplina absoluta son las marcas del arquero élite.', color: 'text-green-700', border: 'border-green-300', bg: 'bg-gradient-to-b from-green-50 to-emerald-100' },
    { name: 'Paladín', icon: '🛡️', bonus: '+20% XP Trabajo en Equipo', desc: 'El guardián que lidera a sus compañeros hacia la victoria total.', color: 'text-amber-700', border: 'border-amber-300', bg: 'bg-gradient-to-b from-amber-50 to-yellow-100' },
    { name: 'Pícaro', icon: '🗡️', bonus: '+20% XP Creatividad', desc: 'Ingeniosa y ágil mente que encuentra caminos únicos al éxito.', color: 'text-purple-700', border: 'border-purple-300', bg: 'bg-gradient-to-b from-purple-50 to-violet-100' },
  ];

  plans = [
    {
      name: 'Explorador', icon: '🗺️', price: 'Gratis', period: '',
      desc: 'Ideal para comenzar y explorar el poder de la gamificación educativa.',
      popular: false, badge: '',
      gradientFrom: '#9ca3af', gradientTo: '#6b7280',
      priceColor: 'text-gray-700',
      btnLabel: '🗺️ COMENZAR GRATIS',
      btnGold: false,
      features: ['1 Aula activa', 'Hasta 30 estudiantes', '3 Misiones simultáneas', 'Sistema de personajes', 'Logros básicos', 'Soporte por email'],
      disabled: ['Tienda de recompensas', 'Reportes avanzados', 'Portal de padres', 'Misiones ilimitadas'],
    },
    {
      name: 'Aventurero', icon: '⚔️', price: 'S/ 19', period: '/mes',
      desc: 'El poder completo para transformar tu aula en una aventura legendaria.',
      popular: true, badge: '⚡ MÁS POPULAR',
      gradientFrom: '#fbbf24', gradientTo: '#d97706',
      priceColor: 'text-amber-600',
      btnLabel: '✨ COMENZAR PRUEBA GRATIS',
      btnGold: true,
      features: ['Aulas ilimitadas', 'Estudiantes ilimitados', 'Misiones ilimitadas', 'Tienda de recompensas', 'Portal de padres', 'Reportes avanzados', 'Soporte prioritario', 'Actualizaciones automáticas'],
      disabled: [],
    },
    {
      name: 'Legendario', icon: '👑', price: 'S/ 79', period: '/mes',
      desc: 'Para instituciones que quieren transformar la educación a escala completa.',
      popular: false, badge: '🏆 INSTITUCIONAL',
      gradientFrom: '#7c3aed', gradientTo: '#5b21b6',
      priceColor: 'text-purple-700',
      btnLabel: '👑 CONTACTAR VENTAS',
      btnGold: false,
      features: ['Todo en Aventurero', 'Panel de Director completo', 'Gestión institucional', 'Analytics avanzados', 'Marca personalizada', 'API de integración', 'Capacitaciones incluidas', 'Soporte dedicado 24/7', 'SLA garantizado'],
      disabled: [],
    },
  ];

  testimonials = [
    { name: 'Prof. María González', role: 'Maestra de Matemáticas', school: 'I.E. San Marcos, Lima', avatar: '🧙‍♀️', text: 'Mis estudiantes nunca habían estado tan motivados. La participación subió un 80% y el ausentismo bajó a casi cero. LegendaryClass transformó completamente mi forma de enseñar.' },
    { name: 'Carlos Quispe', role: 'Estudiante, 3ro de Secundaria', school: 'Colegio Los Andes, Arequipa', avatar: '⚔️', text: 'Es como jugar mientras aprendes. Elegí al Guerrero y cada vez que el profe me da puntos me emociona subir de nivel. Ya llegué al nivel 18 y soy el top de mi salón.' },
    { name: 'Dr. Roberto Flores', role: 'Director Académico', school: 'I.E. Independencia, Cusco', avatar: '👑', text: 'Los reportes del panel de director son extraordinarios. Tenemos datos en tiempo real de todo el colegio y podemos tomar decisiones con información real. Herramienta indispensable.' },
  ];

  faqs = [
    { q: '¿Qué es LegendaryClass?', a: 'LegendaryClass es una plataforma de gamificación educativa que transforma el aula en una aventura de RPG. Los estudiantes ganan XP, eligen personajes heroicos, completan misiones académicas y canjean recompensas reales mientras aprenden de forma entretenida.' },
    { q: '¿Cómo se unen los estudiantes a un aula?', a: 'El maestro genera un código único al crear su aula. Los estudiantes solo necesitan registrarse e ingresar ese código para unirse automáticamente a la aventura. El proceso completo toma menos de 2 minutos.' },
    { q: '¿Es seguro para niños y adolescentes?', a: 'Absolutamente. LegendaryClass cumple estándares estrictos de privacidad. No recopilamos datos personales sensibles, los padres pueden monitorear toda la actividad de sus hijos, y el entorno está completamente moderado por los docentes.' },
    { q: '¿Puedo personalizar las recompensas de mi aula?', a: 'Sí, totalmente. Cada maestro define su propia tienda de recompensas con premios como tiempo libre, stickers, actividades especiales u otros incentivos. Tú decides qué motiva más a tus estudiantes.' },
    { q: '¿Hay período de prueba gratuita en los planes de pago?', a: 'Sí, ofrecemos 14 días de prueba gratuita en el plan Aventurero. No necesitas tarjeta de crédito para comenzar. Al finalizar puedes elegir continuar o quedarte en el plan Explorador gratuito.' },
    { q: '¿LegendaryClass funciona en dispositivos móviles?', a: 'Sí, la plataforma está completamente optimizada para móviles, tablets y computadoras. Los estudiantes pueden acceder, completar misiones y ver su progreso desde cualquier dispositivo con conexión a internet.' },
  ];

  platformLinks = [
    { label: 'Características', section: 'caracteristicas' },
    { label: 'Cómo Funciona', section: 'como-funciona' },
    { label: 'Personajes', section: 'personajes' },
    { label: 'Precios', section: 'precios' },
  ];
  legalLinks = ['Términos de Uso', 'Política de Privacidad', 'Cookies', 'GDPR'];
  supportLinks = ['Centro de Ayuda', 'Documentación', 'Estado del Sistema', 'Contacto'];
}
