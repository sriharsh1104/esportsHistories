import jwt from 'jsonwebtoken';
import OTP from '../models/otpModel.js';
import User from '../models/userModel.js';
import { generateOTP, getOTPRecord, saveOTP, sendOTPEmail, verifyOTPFromDB } from '../services/otpService.js';
import ApiResponse from '../utils/apiResponse.js';

const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h'
    });
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};

// @desc    Register a new user
// @route   POST /api/v1/auth/signup
// @access  Public
export const registerUser = async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user already exists in permanent collection
        const userExists = await User.findOne({ 
            $or: [{ email }, { username }]
        });

        if (userExists) {
            return ApiResponse.error(res, 'User with this email or username already exists', 400);
        }

        // Generate OTP and save with user data
        const otp = generateOTP();
        await saveOTP(email, otp, { username, password });
        
        await sendOTPEmail(email, otp);

        return ApiResponse.success(res, 'OTP sent to your email. Please verify to complete registration.', {
            email
        }, 201);
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Verify OTP and activate user
// @route   POST /api/v1/auth/verify-otp
// @access  Public
export const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const otpRecord = await getOTPRecord(email, otp);

        if (!otpRecord) {
            return ApiResponse.error(res, 'Invalid or expired OTP', 400);
        }

        // Check if this was a registration OTP (has userData)
        if (otpRecord.userData && otpRecord.userData.username) {
            // Create the real user now
            const user = await User.create({
                username: otpRecord.userData.username,
                email: otpRecord.email,
                password: otpRecord.userData.password,
                isVerified: true,
                onboardingStep: 'profile'
            });

            // Delete OTP record
            await OTP.deleteMany({ email });

            return ApiResponse.success(res, 'Account verified and created successfully', {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                onboardingStep: user.onboardingStep,
                addresses: user.addresses || [],
                gameProfiles: user.gameProfiles || [],
                selectedGames: user.selectedGames || [],
                token: generateAccessToken(user._id),
                refreshToken: generateRefreshToken(user._id)
            });
        }

        // If it was just a verification for an existing user (e.g., forgot password)
        const user = await User.findOne({ email });
        if (!user) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        user.isVerified = true;
        await user.save();
        
        // Delete OTP record
        await OTP.deleteMany({ email });

        return ApiResponse.success(res, 'OTP verified successfully', {
            _id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            onboardingStep: user.onboardingStep,
            addresses: user.addresses || [],
            gameProfiles: user.gameProfiles || [],
            selectedGames: user.selectedGames || [],
            token: generateAccessToken(user._id),
            refreshToken: generateRefreshToken(user._id)
        });
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
export const authUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            if (!user.isVerified) {
                return ApiResponse.error(res, 'Please verify your email first', 401);
            }

            return ApiResponse.success(res, 'Login successful', {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                onboardingStep: user.onboardingStep,
                addresses: user.addresses || [],
                gameProfiles: user.gameProfiles || [],
                selectedGames: user.selectedGames || [],
                token: generateAccessToken(user._id),
                refreshToken: generateRefreshToken(user._id)
            });
        } else {
            return ApiResponse.error(res, 'Invalid email or password', 401);
        }
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Refresh Access Token
// @route   POST /api/v1/auth/refresh
// @access  Public
export const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return ApiResponse.error(res, 'Refresh token required', 400);
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        const newAccessToken = generateAccessToken(user._id);

        return ApiResponse.success(res, 'Token refreshed', {
            token: newAccessToken
        });
    } catch (error) {
        return ApiResponse.error(res, 'Invalid or expired refresh token', 401);
    }
};

// @desc    Forget Password - Send OTP
// @route   POST /api/v1/auth/forget-password
// @access  Public
export const forgetPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist' });
        }

        const otp = generateOTP();
        await saveOTP(email, otp);
        await sendOTPEmail(email, otp);

        return ApiResponse.success(res, 'OTP sent to your email');
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Reset Password using OTP
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const isValid = await verifyOTPFromDB(email, otp);

        if (!isValid) {
            return ApiResponse.error(res, 'Invalid or expired OTP', 400);
        }

        const user = await User.findOne({ email });
        if (!user) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        user.password = newPassword;
        await user.save();

        return ApiResponse.success(res, 'Password reset successful');
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Resend OTP
// @route   POST /api/v1/auth/resend-otp
// @access  Public
export const resendOtp = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return ApiResponse.error(res, 'User not found', 404);
        }

        const otp = generateOTP();
        await saveOTP(email, otp);
        await sendOTPEmail(email, otp);

        return ApiResponse.success(res, 'OTP resent successfully');
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};

// @desc    Change Password (Authenticated)
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user._id).select('+password');

        if (user && (await user.matchPassword(oldPassword))) {
            user.password = newPassword;
            await user.save();
            return ApiResponse.success(res, 'Password changed successfully');
        } else {
            return ApiResponse.error(res, 'Invalid old password', 401);
        }
    } catch (error) {
        return ApiResponse.error(res, error.message, 500);
    }
};
