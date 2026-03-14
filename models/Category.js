const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, default: "" }, 
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    sortOrder: { type: Number, default: 0 } // <-- THIS IS NEW!
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);