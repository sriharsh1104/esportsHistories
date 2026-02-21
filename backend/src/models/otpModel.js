import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    userData: {
        username: String,
        password: {
            type: String,
            select: false
        }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // 10 minutes (matching OTP_EXPIRY in .env)
    }
});

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
