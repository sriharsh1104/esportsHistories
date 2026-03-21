import FontAwesome from '@expo/vector-icons/FontAwesome';

/**
 * Maps saved game ids / slugs to a FontAwesome icon for the follow tab (All Football–style).
 */
export function tabIconForGameId(gameId: string): keyof typeof FontAwesome.glyphMap {
  const g = String(gameId).toLowerCase().replace(/\s+/g, '');
  if (g.includes('freefire') || (g.includes('free') && g.includes('fire'))) return 'fire';
  if (g.includes('bgmi') || g.includes('pubg')) return 'crosshairs';
  if (g.includes('mlbb') || g.includes('mobilelegend')) return 'shield';
  if (g.includes('codm') || g.includes('cod')) return 'crosshairs';
  if (g.includes('valorant')) return 'bullseye';
  if (g.includes('lol') || g.includes('league')) return 'trophy';
  if (g.includes('dota')) return 'cube';
  if (g.includes('coc') || g.includes('clashofclans')) return 'fort-awesome';
  if (g.includes('cr') || g.includes('clashroyale')) return 'flag-checkered';
  if (g.includes('wildrift')) return 'mobile';
  return 'gamepad';
}
