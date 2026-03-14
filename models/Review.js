const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String
}, { timestamps: true });

module.exports = mongoose.model('Review', ReviewSchema);