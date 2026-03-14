const mongoose = require('mongoose');

const ChargeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    isMandatory: { type: Boolean, default: false } // <-- NEW FIELD!
});

const VariantSchema = new mongoose.Schema({
    isDefault: { type: Boolean, default: false },
    name: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    buyPrice: { type: Number, required: true },
    sellPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    charges: [ChargeSchema], 
    images: [{ type: String }] 
});

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    bio: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    variants: [VariantSchema],
    sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);