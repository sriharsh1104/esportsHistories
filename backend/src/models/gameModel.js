import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['mobile', 'pc'],
        required: true
    },
    icon: {
        type: String,
        default: 'gamepad'
    }
}, {
    timestamps: true
});

const Game = mongoose.model('Game', gameSchema);
export default Game;
