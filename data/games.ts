/**
 * Esports games popular in India - Mobile & PC
 */
export type Game = {
  id: string;
  name: string;
  slug: string;
};

export type GameCategory = {
  id: string;
  title: string;
  icon: string;
  games: Game[];
};

export const ALL_GAMES: Game[] = [
  { id: 'bgmi', name: 'Battlegrounds Mobile India (BGMI)', slug: 'bgmi' },
  { id: 'freefire', name: 'Garena Free Fire / Free Fire Max', slug: 'free-fire' },
  { id: 'mlbb', name: 'Mobile Legends: Bang Bang', slug: 'mlbb' },
  { id: 'codm', name: 'Call of Duty: Mobile', slug: 'cod-mobile' },
  { id: 'coc', name: 'Clash of Clans', slug: 'clash-of-clans' },
  { id: 'cr', name: 'Clash Royale', slug: 'clash-royale' },
  { id: 'wildrift', name: 'League of Legends: Wild Rift', slug: 'wild-rift' },
  { id: 'valorant', name: 'Valorant', slug: 'valorant' },
  { id: 'r6', name: 'Rainbow Six Siege', slug: 'rainbow-six-siege' },
  { id: 'cs2', name: 'Counter-Strike 2', slug: 'cs2' },
  { id: 'dota2', name: 'Dota 2', slug: 'dota-2' },
  { id: 'lol', name: 'League of Legends', slug: 'league-of-legends' },
  { id: 'fc', name: 'EA Sports FC (FIFA)', slug: 'ea-sports-fc' },
  { id: 'pes', name: 'PES / eFootball', slug: 'pes' },
  { id: 'tekken', name: 'Tekken 8', slug: 'tekken-8' },
];

export const GAME_CATEGORIES: GameCategory[] = [
  {
    id: 'mobile',
    title: 'Mobile Games',
    icon: 'mobile',
    games: [
      { id: 'bgmi', name: 'Battlegrounds Mobile India (BGMI)', slug: 'bgmi' },
      { id: 'freefire', name: 'Garena Free Fire / Free Fire Max', slug: 'free-fire' },
      { id: 'mlbb', name: 'Mobile Legends: Bang Bang', slug: 'mlbb' },
      { id: 'codm', name: 'Call of Duty: Mobile', slug: 'cod-mobile' },
      { id: 'coc', name: 'Clash of Clans', slug: 'clash-of-clans' },
      { id: 'cr', name: 'Clash Royale', slug: 'clash-royale' },
      { id: 'wildrift', name: 'League of Legends: Wild Rift', slug: 'wild-rift' },
    ],
  },
  {
    id: 'pc',
    title: 'PC Games',
    icon: 'desktop',
    games: [
      { id: 'valorant', name: 'Valorant', slug: 'valorant' },
      { id: 'r6', name: 'Rainbow Six Siege', slug: 'rainbow-six-siege' },
      { id: 'cs2', name: 'Counter-Strike 2', slug: 'cs2' },
      { id: 'dota2', name: 'Dota 2', slug: 'dota-2' },
      { id: 'lol', name: 'League of Legends', slug: 'league-of-legends' },
      { id: 'fc', name: 'EA Sports FC (FIFA)', slug: 'ea-sports-fc' },
      { id: 'pes', name: 'PES / eFootball', slug: 'pes' },
      { id: 'tekken', name: 'Tekken 8', slug: 'tekken-8' },
    ],
  },
];
