

# Implement Themed Default Avatars for Teams

## Overview
Currently, when a team doesn't have an uploaded avatar, the fallback shows plain initials on a muted background. This plan adds visually appealing, survivor-themed default avatars that make the experience more fun and personalized even before users upload photos.

## Solution Options

### Recommended Approach: Deterministic Themed Backgrounds with Initials

Each team gets a unique, colorful gradient background based on their team name (or position). This ensures:
- Consistent appearance (same team = same colors)
- Visual variety across teams
- No need for external image assets
- Survivor-inspired color palettes (jungle greens, ocean blues, sunset oranges, tribal reds)

### Implementation

| File | Change |
|------|--------|
| `src/lib/avatarUtils.ts` | New utility file with avatar generation logic |
| `src/components/TeamAvatar.tsx` | New reusable component for team avatars with themed defaults |
| `src/components/TeamAvatarUpload.tsx` | Use new TeamAvatar component |
| `src/components/DraftMode.tsx` | Replace inline Avatar with TeamAvatar |
| `src/components/GameMode.tsx` | Replace inline Avatar with TeamAvatar |
| `src/components/SetupMode.tsx` | Replace inline Avatar with TeamAvatar |

## Technical Details

### Avatar Utility (`src/lib/avatarUtils.ts`)

```typescript
// Survivor-themed color palettes (gradient pairs)
const AVATAR_THEMES = [
  { bg: 'from-emerald-600 to-teal-500', icon: '🌴' },    // Jungle
  { bg: 'from-amber-500 to-orange-600', icon: '🔥' },    // Fire
  { bg: 'from-blue-500 to-cyan-500', icon: '🌊' },       // Ocean
  { bg: 'from-rose-500 to-pink-600', icon: '🌺' },       // Tropical
  { bg: 'from-violet-500 to-purple-600', icon: '🗿' },   // Idol
  { bg: 'from-yellow-500 to-amber-500', icon: '☀️' },   // Sun
  { bg: 'from-slate-600 to-gray-700', icon: '🏝️' },     // Island
  { bg: 'from-red-500 to-rose-600', icon: '🎯' },        // Tribal
];

// Generate consistent theme based on team name
export function getAvatarTheme(teamName: string) {
  const hash = teamName.split('').reduce((acc, char) => 
    acc + char.charCodeAt(0), 0);
  return AVATAR_THEMES[hash % AVATAR_THEMES.length];
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
```

### TeamAvatar Component (`src/components/TeamAvatar.tsx`)

A reusable component that:
1. Shows the uploaded image if `avatarUrl` is provided
2. Falls back to a themed gradient with initials if no image
3. Supports multiple sizes (`sm`, `md`, `lg`)
4. Option to show survivor icon instead of initials (`useIcon` prop)

```tsx
interface TeamAvatarProps {
  teamName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  useIcon?: boolean;  // Show survivor icon instead of initials
  className?: string;
}

export function TeamAvatar({ teamName, avatarUrl, size = 'md', useIcon = false }: TeamAvatarProps) {
  const theme = getAvatarTheme(teamName);
  const sizeClasses = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-16 w-16' };
  
  if (avatarUrl) {
    return (
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={avatarUrl} alt={teamName} />
        <AvatarFallback className={`bg-gradient-to-br ${theme.bg} text-white`}>
          {useIcon ? theme.icon : getInitials(teamName)}
        </AvatarFallback>
      </Avatar>
    );
  }
  
  return (
    <div className={cn(
      sizeClasses[size],
      `bg-gradient-to-br ${theme.bg}`,
      'rounded-full flex items-center justify-center text-white font-bold'
    )}>
      {useIcon ? theme.icon : getInitials(teamName)}
    </div>
  );
}
```

## Visual Examples

```text
Without upload (themed defaults):
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ 🌴      │  │ 🔥      │  │ 🌊      │  │ 🌺      │
│ Green   │  │ Orange  │  │ Blue    │  │ Pink    │
│ Gradient│  │ Gradient│  │ Gradient│  │ Gradient│
│  "BR"   │  │  "CC"   │  │  "KL"   │  │  "RY"   │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
 Team Brad   Team Coco    Team Kalin   Team Roy

With upload:
┌─────────┐
│  Photo  │
│  shows  │
│ instead │
└─────────┘
```

## Benefits

1. **Visual Variety**: Each team gets a unique, colorful avatar without requiring uploads
2. **Survivor Theme**: Colors and icons inspired by Survivor (jungle, fire, ocean, tribal)
3. **Consistency**: Same team name always gets the same theme (deterministic)
4. **Clean Code**: Single reusable component replaces scattered Avatar implementations
5. **Progressive Enhancement**: Works great as default, even better with custom photo

## Alternative Considered: Pre-made Avatar Images

We considered adding static SVG avatar images (e.g., torch, buff designs, tribal patterns) but the gradient approach is:
- Lighter (no additional assets)
- More flexible (infinite combinations)
- Still visually appealing
- Easier to maintain

