import { api } from './api.service';

export type GameCategory = 'mobile' | 'pc';

export interface Game {
  _id: string;
  name: string;
  slug: string;
  category: GameCategory;
  icon: string;
}

export async function fetchAllGames(): Promise<Game[]> {
  try {
    return await api.get<Game[]>('/games');
  } catch (error: any) {
    throw new Error(error.message || 'Failed to fetch games');
  }
}

export async function fetchGamesByCategory(category: GameCategory): Promise<Game[]> {
  try {
    return await api.get<Game[]>(`/games/category/${category}`);
  } catch (error: any) {
    throw new Error(error.message || `Failed to fetch ${category} games`);
  }
}
