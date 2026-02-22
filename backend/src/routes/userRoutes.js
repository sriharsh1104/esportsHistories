import express from 'express';
import { getUserProfile, getWalletData, topUpWallet, updateUserProfile, updateWalletUpi, withdrawWallet } from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

router.get('/wallet', protect, getWalletData);
router.post('/wallet/upi', protect, updateWalletUpi);
router.post('/wallet/topup', protect, topUpWallet);
router.post('/wallet/withdraw', protect, withdrawWallet);

export default router;
