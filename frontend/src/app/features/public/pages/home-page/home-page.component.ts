import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  stats = [
    { icon: '🎓', value: '+5,000', label: 'Estudiantes Activos' },
    { icon: '🧙‍♂️', value: '+500',   label: 'Maestros Registrados' },
    { icon: '🏫', value: '+200',   label: 'Aulas Activas' },
    { icon: '⭐', value: '+100K',  label: 'Misiones Completadas' },
  ];

  sections = [
    { path: '/caracteristicas', icon: '🎮', label: 'Características',  desc: 'Descubre todos los poderes del sistema' },
    { path: '/como-funciona',   icon: '⚙️', label: 'Cómo Funciona',   desc: 'Guía paso a paso para cada rol'         },
    { path: '/personajes',      icon: '⚔️', label: 'Personajes',       desc: '5 clases de héroe únicas'               },
    { path: '/precios',         icon: '💎', label: 'Precios',           desc: 'Planes gratuitos y de pago'             },
    { path: '/faq',             icon: '❓', label: 'FAQ',               desc: 'Preguntas frecuentes resueltas'         },
  ];
}
