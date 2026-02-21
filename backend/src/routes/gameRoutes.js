import express from 'express';
import { getAllGames, getGamesByCategory } from '../controllers/gameController.js';

const router = express.Router();

router.get('/', getAllGames);
router.get('/category/:category', getGamesByCategory);

export default router;
