import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-characters-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './characters-page.component.html',
})
export class CharactersPageComponent {
  characters = [
    {
      name: 'Mago',
      icon: '🧙‍♂️',
      bonus: '+20% XP en Tareas y Lectura',
      desc: 'Domina el conocimiento y la sabiduría arcana para superar todos los retos académicos.',
      color: 'text-indigo-700', border: 'border-indigo-300',
      bg: 'bg-gradient-to-b from-indigo-50 to-violet-100',
      stat: 'Inteligencia', statColor: 'bg-indigo-400',
      bonusKey: 'Tareas y Lectura',
    },
    {
      name: 'Guerrero',
      icon: '⚔️',
      bonus: '+20% XP en Proyectos y Esfuerzo',
      desc: 'Enfrenta cada reto con fuerza y perseverancia. Cada proyecto es una batalla ganada.',
      color: 'text-red-700', border: 'border-red-300',
      bg: 'bg-gradient-to-b from-red-50 to-rose-100',
      stat: 'Fuerza', statColor: 'bg-red-400',
      bonusKey: 'Proyectos y Esfuerzo',
    },
    {
      name: 'Ninja',
      icon: '🥷',
      bonus: '+20% XP en Participación',
      desc: 'Actúa con velocidad y precisión en todo momento. Siempre el primero en participar.',
      color: 'text-green-700', border: 'border-green-300',
      bg: 'bg-gradient-to-b from-green-50 to-emerald-100',
      stat: 'Agilidad', statColor: 'bg-green-400',
      bonusKey: 'Participación',
    },
    {
      name: 'Arquero',
      icon: '🏹',
      bonus: '+20% XP en Precisión',
      desc: 'Encuentra la respuesta exacta con enfoque y detalle. La precisión es tu mayor arma.',
      color: 'text-amber-700', border: 'border-amber-300',
      bg: 'bg-gradient-to-b from-amber-50 to-yellow-100',
      stat: 'Destreza', statColor: 'bg-amber-400',
      bonusKey: 'Precisión',
    },
    {
      name: 'Lanzador',
      icon: '🎯',
      bonus: '+20% XP en Proyectos Creativos',
      desc: 'Innova y crea soluciones únicas. El arte y la invención son el sello del Lanzador.',
      color: 'text-pink-700', border: 'border-pink-300',
      bg: 'bg-gradient-to-b from-pink-50 to-rose-100',
      stat: 'Creatividad', statColor: 'bg-pink-400',
      bonusKey: 'Proyectos Creativos',
    },
  ];

  tableHeaders = ['Tareas y Lectura', 'Proyectos y Esfuerzo', 'Participación', 'Precisión', 'Proyectos Creativos'];
}
