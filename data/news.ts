export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  category: 'pc' | 'mobile';
  game: string;
  timeAgo: string;
};

export const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Valorant Champions 2024: Grand Finals Highlights',
    excerpt: 'Tenz leads Team Liquid to victory in nail-biting overtime finish...',
    category: 'pc',
    game: 'Valorant',
    timeAgo: '2h ago',
  },
  {
    id: '2',
    title: 'Mobile Legends M4 World Championship Begins',
    excerpt: 'Top 16 teams from across the globe compete for $500K prize pool...',
    category: 'mobile',
    game: 'MLBB',
    timeAgo: '5h ago',
  },
  {
    id: '3',
    title: 'Dota 2 TI14 Qualifiers: Surprise Upsets',
    excerpt: 'Underdog teams shake up regional qualifiers in EU and SEA...',
    category: 'pc',
    game: 'Dota 2',
    timeAgo: '8h ago',
  },
  {
    id: '4',
    title: 'PUBG Mobile Pro League Season 3 Announced',
    excerpt: 'New format and increased prize pool for upcoming season...',
    category: 'mobile',
    game: 'PUBG Mobile',
    timeAgo: '1d ago',
  },
  {
    id: '5',
    title: 'LoL Worlds 2024: Group Stage Draw Results',
    excerpt: 'Group of Death confirmed as top seeds face each other early...',
    category: 'pc',
    game: 'League of Legends',
    timeAgo: '2d ago',
  },
];
