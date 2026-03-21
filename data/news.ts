export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  category: 'pc' | 'mobile';
  game: string;
  gameId: string;
  timeAgo: string;
  sortOrder: number; // lower = more recent
  /** Match profile `followedPersonalities` id strings (e.g. knownAs). */
  personalityIds?: string[];
  /** Match profile `followedOrganizations` id strings. */
  organizationIds?: string[];
};

export const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Valorant Champions 2024: Grand Finals Highlights',
    excerpt: 'Tenz leads Team Liquid to victory in nail-biting overtime finish...',
    category: 'pc',
    game: 'Valorant',
    gameId: 'valorant',
    timeAgo: '2h ago',
    sortOrder: 1,
  },
  {
    id: '2',
    title: 'Mobile Legends M4 World Championship Begins',
    excerpt: 'Top 16 teams from across the globe compete for $500K prize pool...',
    category: 'mobile',
    game: 'MLBB',
    gameId: 'mlbb',
    timeAgo: '5h ago',
    sortOrder: 2,
  },
  {
    id: '3',
    title: 'Dota 2 TI14 Qualifiers: Surprise Upsets',
    excerpt: 'Underdog teams shake up regional qualifiers in EU and SEA...',
    category: 'pc',
    game: 'Dota 2',
    gameId: 'dota2',
    timeAgo: '8h ago',
    sortOrder: 3,
  },
  {
    id: '4',
    title: 'PUBG Mobile Pro League Season 3 Announced',
    excerpt: 'New format and increased prize pool for upcoming season...',
    category: 'mobile',
    game: 'PUBG Mobile',
    gameId: 'bgmi',
    timeAgo: '1d ago',
    sortOrder: 5,
    personalityIds: ['Jonathan'],
    organizationIds: ['Team Soul'],
  },
  {
    id: '5',
    title: 'LoL Worlds 2024: Group Stage Draw Results',
    excerpt: 'Group of Death confirmed as top seeds face each other early...',
    category: 'pc',
    game: 'League of Legends',
    gameId: 'lol',
    timeAgo: '2d ago',
    sortOrder: 6,
  },
  {
    id: '6',
    title: 'BGMI India Series Finals This Weekend',
    excerpt: 'Top 24 squads battle for the championship crown...',
    category: 'mobile',
    game: 'BGMI',
    gameId: 'bgmi',
    timeAgo: '3h ago',
    sortOrder: 2,
    personalityIds: ['Mortal', 'ScoutOP'],
  },
  {
    id: '7',
    title: 'Free Fire India Championship Announced',
    excerpt: 'Garena announces regional competitive circuit...',
    category: 'mobile',
    game: 'Free Fire',
    gameId: 'freefire',
    timeAgo: '6h ago',
    sortOrder: 4,
    organizationIds: ['S8UL Esports', 'GodLike Esports'],
  },
  {
    id: '8',
    title: 'CS2 Major Stockholm Highlights',
    excerpt: 'NAVI dominates in historic third Major victory...',
    category: 'pc',
    game: 'CS2',
    gameId: 'cs2',
    timeAgo: '1d ago',
    sortOrder: 5,
  },
];
