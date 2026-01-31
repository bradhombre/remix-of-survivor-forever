// Survivor-themed color palettes (gradient pairs)
export const AVATAR_THEMES = [
  { bg: 'from-emerald-600 to-teal-500', icon: '🌴' },    // Jungle
  { bg: 'from-amber-500 to-orange-600', icon: '🔥' },    // Fire
  { bg: 'from-blue-500 to-cyan-500', icon: '🌊' },       // Ocean
  { bg: 'from-rose-500 to-pink-600', icon: '🌺' },       // Tropical
  { bg: 'from-violet-500 to-purple-600', icon: '🗿' },   // Idol
  { bg: 'from-yellow-500 to-amber-500', icon: '☀️' },   // Sun
  { bg: 'from-slate-600 to-gray-700', icon: '🏝️' },     // Island
  { bg: 'from-red-500 to-rose-600', icon: '🎯' },        // Tribal
];

/**
 * Generate a consistent theme based on team name using a simple hash
 */
export function getAvatarTheme(teamName: string) {
  const hash = teamName.split('').reduce((acc, char) => 
    acc + char.charCodeAt(0), 0);
  return AVATAR_THEMES[hash % AVATAR_THEMES.length];
}

/**
 * Get initials from a name (up to 2 characters)
 */
export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
