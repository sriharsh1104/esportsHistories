import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please add a username'],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    profilePic: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        maxlength: [200, 'Bio cannot be more than 200 characters']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    fullName: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    upiIds: {
        type: [String],
        default: []
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    onboardingStep: {
        type: String,
        enum: ['profile', 'games', 'done'],
        default: 'profile'
    },
    selectedGames: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
    }],
    addresses: [{
        line1: { type: String, required: true },
        line2: { type: String },
        city: { type: String, required: true },
        state: { type: String },
        pincode: { type: String, required: true },
        phone: { type: String, required: true },
        isDefault: { type: Boolean, default: false }
    }],
    gameProfiles: [{
        gameId: { type: String, required: true },
        gameName: { type: String, required: true },
        gameUid: { type: String, required: true }
    }],
    refreshToken: {
        type: String,
        select: false
    }
}, {
    timestamps: true
});

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
