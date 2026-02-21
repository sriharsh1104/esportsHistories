import crypto from 'crypto';
import { Resend } from 'resend';
import OTP from '../models/otpModel.js';

let resend;

const getResendClient = () => {
    if (!resend) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
    return resend;
};

export const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

export const sendOTPEmail = async (email, otp) => {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key' || process.env.RESEND_API_KEY === '') {
        console.log(`MOCK EMAIL: Sent OTP ${otp} to ${email}`);
        return { success: true, mock: true };
    }

    try {
        const client = getResendClient();
        const { data, error } = await client.emails.send({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Your Verification Code',
            html: `<strong>Your OTP is: ${otp}</strong>. It will expire in 10 minutes.`
        });

        if (error) {
            console.error('Resend Error:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('Service Error:', err);
        return { success: false, error: err.message };
    }
};

export const saveOTP = async (email, otp, userData = null) => {
    // Delete any existing OTP for this email
    await OTP.deleteMany({ email });
    
    // Save new OTP
    const otpData = { email, otp };
    if (userData) {
        otpData.userData = userData;
    }
    const newOTP = new OTP(otpData);
    await newOTP.save();
};

export const getOTPRecord = async (email, otp) => {
    return await OTP.findOne({ email, otp });
};

export const verifyOTPFromDB = async (email, otp) => {
    const record = await OTP.findOne({ email, otp });
    return !!record;
};
