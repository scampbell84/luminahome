export interface AvatarIconOption {
  id: string;
  label: string;
  emoji: string;
  category: 'food' | 'fun' | 'animals' | 'magic' | 'sports';
}

export const AVATAR_ICON_OPTIONS: AvatarIconOption[] = [
  // Food & Treats (Requested: including donuts and pizza)
  { id: 'donut', label: 'Donut', emoji: '🍩', category: 'food' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕', category: 'food' },
  { id: 'icecream', label: 'Ice Cream', emoji: '🍦', category: 'food' },
  { id: 'cookie', label: 'Cookie', emoji: '🍪', category: 'food' },
  { id: 'burger', label: 'Burger', emoji: '🍔', category: 'food' },
  { id: 'cupcake', label: 'Cupcake', emoji: '🧁', category: 'food' },
  { id: 'watermelon', label: 'Watermelon', emoji: '🍉', category: 'food' },
  { id: 'taco', label: 'Taco', emoji: '🌮', category: 'food' },
  { id: 'popcorn', label: 'Popcorn', emoji: '🍿', category: 'food' },
  { id: 'apple', label: 'Apple', emoji: '🍎', category: 'food' },

  // Fun & Characters
  { id: 'rocket', label: 'Rocket', emoji: '🚀', category: 'fun' },
  { id: 'crown', label: 'Crown', emoji: '👑', category: 'fun' },
  { id: 'alien', label: 'Alien', emoji: '👾', category: 'fun' },
  { id: 'robot', label: 'Robot', emoji: '🤖', category: 'fun' },
  { id: 'superhero', label: 'Superhero', emoji: '🦸', category: 'fun' },
  { id: 'gamepad', label: 'Gamepad', emoji: '🎮', category: 'fun' },

  // Animals & Creatures
  { id: 'dinosaur', label: 'Dinosaur', emoji: '🦖', category: 'animals' },
  { id: 'unicorn', label: 'Unicorn', emoji: '🦄', category: 'animals' },
  { id: 'lion', label: 'Lion', emoji: '🦁', category: 'animals' },
  { id: 'panda', label: 'Panda', emoji: '🐼', category: 'animals' },
  { id: 'puppy', label: 'Puppy', emoji: '🐶', category: 'animals' },
  { id: 'kitty', label: 'Kitten', emoji: '🐱', category: 'animals' },

  // Stars & Magic Expressions
  { id: 'smile', label: 'Smile', emoji: '😊', category: 'magic' },
  { id: 'cool', label: 'Cool', emoji: '😎', category: 'magic' },
  { id: 'star', label: 'Star', emoji: '⭐', category: 'magic' },
  { id: 'sparkles', label: 'Sparkles', emoji: '✨', category: 'magic' },
  { id: 'heart', label: 'Heart', emoji: '💖', category: 'magic' },
  { id: 'fire', label: 'Fire', emoji: '🔥', category: 'magic' },
  { id: 'rainbow', label: 'Rainbow', emoji: '🌈', category: 'magic' },

  // Sports & Hobbies
  { id: 'soccer', label: 'Soccer', emoji: '⚽', category: 'sports' },
  { id: 'basketball', label: 'Basketball', emoji: '🏀', category: 'sports' },
  { id: 'music', label: 'Music', emoji: '🎵', category: 'sports' },
  { id: 'art', label: 'Painting', emoji: '🎨', category: 'sports' },
  { id: 'skateboard', label: 'Skate', emoji: '🛹', category: 'sports' },
];

export const AVATAR_ICON_MAP: Record<string, string> = {
  // Food
  donut: '🍩',
  pizza: '🍕',
  icecream: '🍦',
  'ice-cream': '🍦',
  cookie: '🍪',
  burger: '🍔',
  cupcake: '🧁',
  watermelon: '🍉',
  taco: '🌮',
  popcorn: '🍿',
  apple: '🍎',

  // Fun
  rocket: '🚀',
  crown: '👑',
  alien: '👾',
  robot: '🤖',
  superhero: '🦸',
  gamepad: '🎮',

  // Animals
  dinosaur: '🦖',
  trex: '🦖',
  unicorn: '🦄',
  lion: '🦁',
  panda: '🐼',
  puppy: '🐶',
  kitty: '🐱',

  // Magic
  smile: '😊',
  cool: '😎',
  star: '⭐',
  sparkles: '✨',
  heart: '💖',
  fire: '🔥',
  rainbow: '🌈',

  // Sports
  soccer: '⚽',
  basketball: '🏀',
  music: '🎵',
  art: '🎨',
  skateboard: '🛹',
};

/**
 * Returns a colorful emoji string for any avatar icon ID, with safe fallback to '😊'.
 */
export const getAvatarEmoji = (iconId?: string): string => {
  if (!iconId) return '😊';
  const key = iconId.toLowerCase().trim();
  return AVATAR_ICON_MAP[key] || '😊';
};
