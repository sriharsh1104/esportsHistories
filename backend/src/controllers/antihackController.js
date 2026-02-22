import axios from 'axios';
import ApiResponse from '../utils/apiResponse.js';

/**
 * @desc    Check if a gaming account is banned
 * @route   POST /api/v1/antihack/check
 * @access  Public
 */
export const checkBannedStatus = async (req, res) => {
    const { game, uid, lang = 'en' } = req.body;

    if (!game || !uid) {
        return ApiResponse.error(res, 'Game and UID are required', 400);
    }

    let apiUrl = '';

    if (game.toLowerCase() === 'freefire') {
        apiUrl = process.env.FREEFIRE_ANTIHACK_URL;
    } else {
        return ApiResponse.error(res, 'Game not supported for ban check', 400);
    }

    try {
        console.log(`[Antihack] Checking ban status for ${game} (UID: ${uid})`);
        console.log(`[Antihack] Hitting URL: ${apiUrl}`);
        console.log(`[Antihack] Query Params:`, { lang, uid });

        const response = await axios.get(apiUrl, {
            params: {
                lang: lang,
                uid: uid
            },
            headers: {
                'authority': 'ff.garena.com',
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'referer': 'https://ff.garena.com/en/support/',
                'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
                'x-requested-with': 'B6FksShzIgjfrYImLpTsadjS86sddhFH'
            }
        });

        console.log(`[Antihack] Response Data:`, response.data);

        // Returning raw Garena response as requested by user
        return res.status(200).json(response.data);
    } catch (error) {
        console.error('Error hitting antihack API:', error.message);
        return ApiResponse.error(res, 'Failed to check ban status', 500);
    }
};
