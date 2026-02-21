import Game from '../models/gameModel.js';
import ApiResponse from '../utils/apiResponse.js';

// @desc    Get all games
// @route   GET /api/v1/games
// @access  Public
export const getAllGames = async (req, res) => {
    try {
        const games = await Game.find({});
        return ApiResponse.success(res, 'Games retrieved successfully', games);
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Get games by category
// @route   GET /api/v1/games/category/:category
// @access  Public
export const getGamesByCategory = async (req, res) => {
    try {
        const games = await Game.find({ category: req.params.category });
        return ApiResponse.success(res, `Games retrieved for category: ${req.params.category}`, games);
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};
