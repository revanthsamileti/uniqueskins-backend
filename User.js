const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // In a real app, we hash this!
    phone: { type: String },
    address: {
        street: String,
        city: String,
        state: String,
        zip: String
    },
    role: { type: String, default: 'customer' } // 'customer' or 'admin'
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);