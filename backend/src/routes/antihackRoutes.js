import express from 'express';
import { checkBannedStatus } from '../controllers/antihackController.js';

const router = express.Router();

router.post('/check', checkBannedStatus);

export default router;
