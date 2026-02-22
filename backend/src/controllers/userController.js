import Transaction from '../models/transactionModel.js';
import User from '../models/userModel.js';
import ApiResponse from '../utils/apiResponse.js';

// @desc    Get user profile
// @route   GET /api/v1/user/profile
// @access  Private
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('selectedGames');

        if (user) {
            return ApiResponse.success(res, 'Profile retrieved', {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                isVerified: user.isVerified,
                profilePic: user.profilePic,
                bio: user.bio,
                role: user.role,
                onboardingStep: user.onboardingStep,
                selectedGames: user.selectedGames,
                addresses: user.addresses || [],
                gameProfiles: user.gameProfiles || []
            });
        } else {
            return ApiResponse.error(res, 'User not found', 404);
        }
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Update user profile
// @route   PUT /api/v1/user/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            user.fullName = req.body.fullName !== undefined ? req.body.fullName : user.fullName;
            user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
            user.profilePic = req.body.profilePic || user.profilePic;
            user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
            user.onboardingStep = req.body.onboardingStep || user.onboardingStep;
            user.selectedGames = req.body.selectedGames || user.selectedGames;
            user.addresses = req.body.addresses !== undefined ? req.body.addresses : user.addresses;
            user.gameProfiles = req.body.gameProfiles !== undefined ? req.body.gameProfiles : user.gameProfiles;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await (await user.save()).populate('selectedGames');

            return ApiResponse.success(res, 'Profile updated', {
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                phone: updatedUser.phone,
                profilePic: updatedUser.profilePic,
                bio: updatedUser.bio,
                role: updatedUser.role,
                onboardingStep: updatedUser.onboardingStep,
                selectedGames: updatedUser.selectedGames,
                addresses: updatedUser.addresses || [],
                gameProfiles: updatedUser.gameProfiles || []
            });
        } else {
            return ApiResponse.error(res, 'User not found', 404);
        }
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Get user wallet data (balance and UPI IDs)
// @route   GET /api/v1/user/wallet
// @access  Private
export const getWalletData = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            return ApiResponse.success(res, 'Wallet data retrieved', {
                walletBalance: user.walletBalance || 0,
                upiIds: user.upiIds || []
            });
        } else {
            return ApiResponse.error(res, 'User not found', 404);
        }
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Top up user wallet balance
// @route   POST /api/v1/user/wallet/topup
// @access  Private
export const topUpWallet = async (req, res) => {
    try {
        const { amount } = req.body;
        const topUpAmount = parseFloat(amount);

        if (isNaN(topUpAmount) || topUpAmount <= 0) {
            return ApiResponse.error(res, 'Invalid top up amount', 400);
        }

        const user = await User.findById(req.user._id);

        if (user) {
            user.walletBalance = (user.walletBalance || 0) + topUpAmount;
            await user.save();

            // Record transaction
            await Transaction.create({
                user: user._id,
                type: 'topup',
                amount: topUpAmount,
                status: 'success',
                description: 'Wallet top up'
            });

            return ApiResponse.success(res, 'Wallet topped up successfully', {
                walletBalance: user.walletBalance
            });
        } else {
            return ApiResponse.error(res, 'User not found', 404);
        }
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Update user UPI IDs
// @route   POST /api/v1/user/wallet/upi
// @access  Private
export const updateWalletUpi = async (req, res) => {
    try {
        const { upiIds } = req.body;

        if (!upiIds || !Array.isArray(upiIds)) {
            return ApiResponse.error(res, 'Invalid UPI IDs format', 400);
        }

        const user = await User.findById(req.user._id);

        if (user) {
            user.upiIds = upiIds;
            await user.save();

            return ApiResponse.success(res, 'UPI IDs updated successfully', {
                upiIds: user.upiIds
            });
        } else {
            return ApiResponse.error(res, 'User not found', 404);
        }
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Withdraw from user wallet
// @route   POST /api/v1/user/wallet/withdraw
// @access  Private
export const withdrawWallet = async (req, res) => {
    try {
        const { amount, upiId } = req.body;
        const withdrawAmount = parseFloat(amount);

        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            return ApiResponse.error(res, 'Invalid withdrawal amount', 400);
        }

        if (!upiId) {
            return ApiResponse.error(res, 'UPI ID is required for withdrawal', 400);
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        if ((user.walletBalance || 0) < withdrawAmount) {
            return ApiResponse.error(res, 'Insufficient balance', 400);
        }

        user.walletBalance -= withdrawAmount;
        await user.save();

        // Record transaction
        await Transaction.create({
            user: user._id,
            type: 'withdrawal',
            amount: withdrawAmount,
            status: 'success', // or 'pending' if manual approval is needed
            upiId: upiId,
            description: `Withdrawal to ${upiId}`
        });

        return ApiResponse.success(res, 'Withdrawal successful', {
            walletBalance: user.walletBalance
        });
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};
