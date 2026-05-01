export type Role = 'student' | 'teacher' | 'director' | 'parent' | 'admin';
export type CharacterType = 'mago' | 'guerrero' | 'ninja' | 'arquero' | 'lanzador';
export type CharacterBonusType = 'knowledge' | 'strength' | 'agility' | 'precision' | 'creativity';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  isActive: boolean;

  // Gamification
  characterType?: CharacterType;
  characterBonusType?: CharacterBonusType;
  experiencePoints: number;
  level: number;
  points: number;
  achievementsCount: number;
  questsCompleted: number;
  positivePoints: number;
  negativePoints: number;
  rewardsEarned: number;
  loginStreak: number;
  firstCharacterSelection: boolean;

  // Stats
  strength: number;
  intelligence: number;
  agility: number;
  creativity: number;
  leadership: number;
  resilience: number;

  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/** Mapea el CharacterType en español al nombre del archivo de imagen en inglés */
export const CHAR_IMAGE_NAME: Record<CharacterType, string> = {
  mago:     'mage',
  guerrero: 'warrior',
  ninja:    'ninja',
  arquero:  'archer',
  lanzador: 'launcher',
};

/** Devuelve la ruta de la imagen del personaje según tipo y tier */
export function charImagePath(type: CharacterType | string, tier: 1 | 2 | 3 | 4 = 1): string {
  const name = CHAR_IMAGE_NAME[type as CharacterType] ?? type;
  return `assets/characters/${name}_tier_${tier}.png`;
}

/** Devuelve la ruta del escudo del personaje */
export function charShieldPath(type: CharacterType | string): string {
  const name = CHAR_IMAGE_NAME[type as CharacterType] ?? type;
  return `assets/escudos/escudo${name}.png`;
}

/** Calcula el tier según el nivel (igual que PHP) */
export function levelToTier(level: number): 1 | 2 | 3 | 4 {
  if (level >= 75) return 4;
  if (level >= 50) return 3;
  if (level >= 25) return 2;
  return 1;
}

export const CHARACTER_DATA: Record<CharacterType, {
  icon: string; name: string; description: string; bonusType: CharacterBonusType;
  bonusActions: string[]; color: string; gradient: string;
}> = {
  mago: {
    icon: '🧙‍♂️',
    name: 'Mago',
    description: 'Domina el conocimiento y la sabiduría arcana. Obtén +20% XP en tareas, quizzes y lectura.',
    bonusType: 'knowledge',
    bonusActions: ['homework', 'quiz', 'reading', 'study'],
    color: '#6366F1',
    gradient: 'from-indigo-600 to-purple-700',
  },
  guerrero: {
    icon: '⚔️',
    name: 'Guerrero',
    description: 'Enfrenta los retos con fuerza y perseverancia. Obtén +20% XP en proyectos y esfuerzo.',
    bonusType: 'strength',
    bonusActions: ['project', 'challenge', 'persistence', 'effort'],
    color: '#EF4444',
    gradient: 'from-red-600 to-orange-600',
  },
  ninja: {
    icon: '🥷',
    name: 'Ninja',
    description: 'Actúa con velocidad y precisión en todo momento. Obtén +20% XP en participación.',
    bonusType: 'agility',
    bonusActions: ['participation', 'quick_response', 'active'],
    color: '#10B981',
    gradient: 'from-emerald-600 to-teal-600',
  },
  arquero: {
    icon: '🏹',
    name: 'Arquero',
    description: 'Encuentra la respuesta exacta con enfoque y detalle. Obtén +20% XP en precisión.',
    bonusType: 'precision',
    bonusActions: ['accuracy', 'detail', 'careful', 'perfect'],
    color: '#F59E0B',
    gradient: 'from-amber-500 to-yellow-500',
  },
  lanzador: {
    icon: '🎯',
    name: 'Lanzador',
    description: 'Innova y crea soluciones únicas con creatividad. Obtén +20% XP en proyectos creativos.',
    bonusType: 'creativity',
    bonusActions: ['creative', 'art', 'innovation', 'original'],
    color: '#EC4899',
    gradient: 'from-pink-600 to-rose-600',
  },
};
