import dotenv from 'dotenv';
import connectDB from '../src/config/db.js';
import Game from '../src/models/gameModel.js';

dotenv.config();

const games = [
    // Mobile Games
    { name: 'Battlegrounds Mobile India (BGMI)', slug: 'bgmi', category: 'mobile', icon: 'mobile' },
    { name: 'Garena Free Fire / Free Fire Max', slug: 'free-fire', category: 'mobile', icon: 'mobile' },
    { name: 'Mobile Legends: Bang Bang', slug: 'mlbb', category: 'mobile', icon: 'mobile' },
    { name: 'Call of Duty: Mobile', slug: 'cod-mobile', category: 'mobile', icon: 'mobile' },
    { name: 'Clash of Clans', slug: 'clash-of-clans', category: 'mobile', icon: 'mobile' },
    { name: 'Clash Royale', slug: 'clash-royale', category: 'mobile', icon: 'mobile' },
    { name: 'League of Legends: Wild Rift', slug: 'wild-rift', category: 'mobile', icon: 'mobile' },

    // PC Games
    { name: 'Valorant', slug: 'valorant', category: 'pc', icon: 'desktop' },
    { name: 'Rainbow Six Siege', slug: 'rainbow-six-siege', category: 'pc', icon: 'desktop' },
    { name: 'Counter-Strike 2', slug: 'cs2', category: 'pc', icon: 'desktop' },
    { name: 'Dota 2', slug: 'dota-2', category: 'pc', icon: 'desktop' },
    { name: 'League of Legends', slug: 'league-of-legends', category: 'pc', icon: 'desktop' },
    { name: 'EA Sports FC (FIFA)', slug: 'ea-sports-fc', category: 'pc', icon: 'desktop' },
    { name: 'PES / eFootball', slug: 'pes', category: 'pc', icon: 'desktop' },
    { name: 'Tekken 8', slug: 'tekken-8', category: 'pc', icon: 'desktop' }
];

const seedGames = async () => {
    try {
        await connectDB();
        
        // Clear existing games
        await Game.deleteMany();
        console.log('Old games removed');

        // Insert new games
        await Game.insertMany(games);
        console.log('Games seeded successfully');

        process.exit();
    } catch (error) {
        console.error('Error seeding games:', error);
        process.exit(1);
    }
};

seedGames();
