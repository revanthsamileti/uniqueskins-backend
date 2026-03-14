const mongoose = require('mongoose');

const StoreSettingsSchema = new mongoose.Schema({
    shopName: { type: String, default: "Unique Skins" },
    address: { type: String, default: "123 Tech Market, Vijayawada, AP" },
    phone: { type: String, default: "+91 98765 43210" },
    email: { type: String, default: "support@uniqueskins.in" },
    mapEmbedUrl: { type: String, default: "" }, // For the Zepto-style map
    heroBanners: [{ type: String }] // Array of image URLs for the scrolling banner
});

module.exports = mongoose.model('StoreSettings', StoreSettingsSchema);