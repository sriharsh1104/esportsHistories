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
                isVerified: user.isVerified,
                profilePic: user.profilePic,
                bio: user.bio,
                role: user.role,
                onboardingStep: user.onboardingStep,
                selectedGames: user.selectedGames
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
            user.profilePic = req.body.profilePic || user.profilePic;
            user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
            user.onboardingStep = req.body.onboardingStep || user.onboardingStep;
            user.selectedGames = req.body.selectedGames || user.selectedGames;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await (await user.save()).populate('selectedGames');

            return ApiResponse.success(res, 'Profile updated', {
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                profilePic: updatedUser.profilePic,
                bio: updatedUser.bio,
                role: updatedUser.role,
                onboardingStep: updatedUser.onboardingStep,
                selectedGames: updatedUser.selectedGames
            });
        } else {
            return ApiResponse.error(res, 'User not found', 404);
        }
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};
