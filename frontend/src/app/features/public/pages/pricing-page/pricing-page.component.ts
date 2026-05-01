import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './pricing-page.component.html',
})
export class PricingPageComponent {
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
      features: ['Todo en Aventurero', 'Panel de Director', 'Gestión institucional', 'Analytics avanzados', 'Marca personalizada', 'API de integración', 'Capacitaciones incluidas', 'Soporte dedicado 24/7', 'SLA garantizado'],
      disabled: [],
    },
  ];

  testimonials = [
    { avatar: '🧙‍♀️', name: 'Prof. María G.', role: 'Maestra, Lima',     text: 'LegendaryClass transformó mi aula. La participación subió un 80% en el primer mes.' },
    { avatar: '👑',    name: 'Dr. Roberto F.',  role: 'Director, Cusco',   text: 'Los reportes del panel de director son exactamente lo que necesitábamos.' },
    { avatar: '⚔️',    name: 'Carlos Q.',        role: 'Estudiante, Arequipa', text: 'Es como jugar mientras aprendes. Ya llegué al nivel 18 y soy el top del salón.' },
  ];
}
