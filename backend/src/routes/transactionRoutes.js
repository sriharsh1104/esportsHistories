import express from 'express';
import { getTransactions } from '../controllers/transactionController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getTransactions);

export default router;
