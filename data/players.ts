export type Player = {
  id: string;
  displayName: string;
  gameId: string;
  gameName: string;
};

export const MOCK_PLAYERS: Player[] = [
  { id: 'p1', displayName: 'Tenz', gameId: 'valorant', gameName: 'Valorant' },
  { id: 'p2', displayName: 'Sc0utOP', gameId: 'bgmi', gameName: 'BGMI' },
  { id: 'p3', displayName: 'Faker', gameId: 'lol', gameName: 'League of Legends' },
  { id: 'p4', displayName: 'Omega', gameId: 'mlbb', gameName: 'MLBB' },
  { id: 'p5', displayName: 'Jonathan', gameId: 'bgmi', gameName: 'BGMI' },
  { id: 'p6', displayName: 'Zombs', gameId: 'valorant', gameName: 'Valorant' },
];
