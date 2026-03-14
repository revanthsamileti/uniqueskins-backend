require('dns').setDefaultResultOrder('ipv4first');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay'); // 🔥 RAZORPAY IMPORT
require('dotenv').config();

const Category = require('./models/Category');
const Product = require('./models/Product');
const User = require('./models/User');
const Order = require('./models/Order');
const Review = require('./models/Review');
const StoreSettings = require('./models/StoreSettings');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || 'uniqueskins_super_secret_key_2026';

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to Unique Skins Database!'))
    .catch(err => console.error('❌ Database connection error:', err));

// ==========================================
// 🔥 EMAIL & OTP ENGINE
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const otpStore = new Map();

app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

        const mailOptions = {
            from: `"Unique Skins" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Unique Skins Verification Code',
            html: `<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;"><h2 style="color: #E60000;">UNIQUE SKINS</h2><p>Your verification code is:</p><h1 style="font-size: 40px; letter-spacing: 5px; color: #111;">${otp}</h1><p style="color: #888;">This code expires in 5 minutes.</p></div>`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "OTP sent successfully!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send email. Check your .env credentials." });
    }
});

app.post('/api/auth/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const storedData = otpStore.get(email);
    if (!storedData) return res.status(400).json({ error: "OTP not found or expired." });
    if (Date.now() > storedData.expiresAt) { otpStore.delete(email); return res.status(400).json({ error: "OTP has expired." }); }
    if (storedData.otp !== otp) return res.status(400).json({ error: "Invalid OTP code." });
    otpStore.delete(email);
    res.status(200).json({ message: "OTP verified successfully!" });
});


// ==========================================
// SECURE AUTHENTICATION APIs
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered." });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const isFirstUser = (await User.countDocuments()) === 0;
        const role = isFirstUser || email === 'samiletirevanthgopal2006@gmail.com' ? 'admin' : 'customer';
        const newUser = new User({ name, email, phone, password: hashedPassword, role });
        await newUser.save();
        const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid email or password." });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid email or password." });
        if (user.email === 'samiletirevanthgopal2006@gmail.com' && user.role !== 'admin') { user.role = 'admin'; await user.save(); }
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 🔥 PAYMENT GATEWAY API (RAZORPAY)
// ==========================================
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.post('/api/payment/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        // Razorpay accepts amounts in paise (multiply by 100)
        const options = {
            amount: Math.round(amount * 100), 
            currency: "INR",
            receipt: "rcpt_" + Date.now(),
        };
        const order = await razorpayInstance.orders.create(options);
        // Send the order details AND the public key ID back to frontend
        res.status(200).json({ order: order, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        console.error("Razorpay Error:", err);
        res.status(500).json({ error: "Failed to create Razorpay order" });
    }
});

// ==========================================
// CATALOG & SETTINGS APIs
// ==========================================
app.post('/api/categories', async (req, res) => { try { res.status(201).json(await new Category(req.body).save()); } catch (err) { res.status(500).json({ error: err.message }); } });
app.post('/api/products', async (req, res) => { try { res.status(201).json(await new Product(req.body).save()); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/catalog', async (req, res) => { try { const categories = await Category.find().sort({ sortOrder: 1 }); const products = await Product.find().sort({ sortOrder: 1 }); res.status(200).json({ categories, products }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/categories/:id', async (req, res) => { try { res.status(200).json(await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/products/:id', async (req, res) => { try { res.status(200).json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/reorder', async (req, res) => { try { const { items } = req.body; for (let item of items) { if (item.type === 'category') await Category.findByIdAndUpdate(item.id, { sortOrder: item.sortOrder, parentId: item.parentId === 'root' ? null : item.parentId }); else if (item.type === 'product') await Product.findByIdAndUpdate(item.id, { sortOrder: item.sortOrder, categoryId: item.parentId === 'root' ? null : item.parentId }); } res.status(200).json({ message: "Reordered successfully" }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.delete('/api/bulk-delete', async (req, res) => { try { const { ids } = req.body; await Category.deleteMany({ _id: { $in: ids } }); await Product.deleteMany({ _id: { $in: ids } }); res.status(200).json({ message: "Deleted successfully" }); } catch (err) { res.status(500).json({ error: err.message }); } });

// ==========================================
// DASHBOARD, ORDERS, USERS & SETTINGS APIs
// ==========================================
app.post('/api/orders', async (req, res) => { try { const newOrder = new Order(req.body); await newOrder.save(); res.status(201).json(newOrder); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/orders/user/:userId', async (req, res) => { try { const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 }); res.status(200).json(orders); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/dashboard-stats', async (req, res) => { try { const totalProducts = await Product.countDocuments(); const totalOrders = await Order.countDocuments(); const totalUsers = await User.countDocuments(); const deliveredOrders = await Order.find({ status: 'Delivered' }); const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0); res.status(200).json({ totalProducts, totalOrders, totalUsers, totalRevenue }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/orders', async (req, res) => { try { const orders = await Order.find().sort({ createdAt: -1 }).populate('userId', 'name email phone'); res.status(200).json(orders); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/orders/:id/status', async (req, res) => { try { const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }); res.status(200).json(updatedOrder); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/users', async (req, res) => { try { res.status(200).json(await User.find().select('-password')); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/settings', async (req, res) => { try { let settings = await StoreSettings.findOne(); if (!settings) settings = await new StoreSettings().save(); res.status(200).json(settings); } catch (err) { res.status(500).json({ error: err.message }); } });
app.put('/api/settings', async (req, res) => { try { let settings = await StoreSettings.findOne(); settings = await StoreSettings.findByIdAndUpdate(settings._id, req.body, { new: true }); res.status(200).json(settings); } catch (err) { res.status(500).json({ error: err.message }); } });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Real Razorpay E-Commerce Server running on http://localhost:${PORT}`);
});
