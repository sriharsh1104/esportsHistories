import Transaction from '../models/transactionModel.js';
import ApiResponse from '../utils/apiResponse.js';

// @desc    Get user transaction history
// @route   GET /api/v1/transactions
// @access  Private
export const getTransactions = async (req, res) => {
    try {
        const { type, status, startDate, endDate } = req.query;
        let query = { user: req.user._id };

        if (type) query.type = type;
        if (status) query.status = status;
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(query).sort({ createdAt: -1 });

        return ApiResponse.success(res, 'Transactions retrieved successfully', transactions);
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};
