import express from 'express';
import {
    authUser,
    changePassword,
    forgetPassword,
    registerUser,
    resendOtp,
    resetPassword,
    verifyOtp
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/signup', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/login', authUser);
router.post('/forget-password', forgetPassword);
router.post('/reset-password', resetPassword);
router.post('/resend-otp', resendOtp);

router.put('/change-password', protect, changePassword);

export default router;
