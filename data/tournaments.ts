export type Tournament = {
  id: string;
  name: string;
  gameId: string;
  gameName: string;
  status: 'ongoing' | 'upcoming' | 'recent';
  startDate: string;
  prizePool: string;
  teamsCount: number;
};

export const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: '1',
    name: 'BGMI India Series 2024',
    gameId: 'bgmi',
    gameName: 'BGMI',
    status: 'ongoing',
    startDate: 'Feb 10, 2025',
    prizePool: '₹25 Lakh',
    teamsCount: 24,
  },
  {
    id: '2',
    name: 'Valorant Champions Tour India',
    gameId: 'valorant',
    gameName: 'Valorant',
    status: 'ongoing',
    startDate: 'Feb 1, 2025',
    prizePool: '₹15 Lakh',
    teamsCount: 16,
  },
  {
    id: '3',
    name: 'Free Fire India Championship',
    gameId: 'freefire',
    gameName: 'Free Fire',
    status: 'upcoming',
    startDate: 'Mar 5, 2025',
    prizePool: '₹20 Lakh',
    teamsCount: 18,
  },
  {
    id: '4',
    name: 'MLBB M4 World Championship',
    gameId: 'mlbb',
    gameName: 'MLBB',
    status: 'ongoing',
    startDate: 'Jan 15, 2025',
    prizePool: '$500K',
    teamsCount: 16,
  },
  {
    id: '5',
    name: 'CODM India Cup',
    gameId: 'codm',
    gameName: 'CODM',
    status: 'upcoming',
    startDate: 'Mar 20, 2025',
    prizePool: '₹10 Lakh',
    teamsCount: 12,
  },
  {
    id: '6',
    name: 'LoL India Regional Finals',
    gameId: 'lol',
    gameName: 'League of Legends',
    status: 'recent',
    startDate: 'Jan 28, 2025',
    prizePool: '₹8 Lakh',
    teamsCount: 8,
  },
];
