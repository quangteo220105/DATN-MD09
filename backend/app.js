var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

// Gọi các file router và config
var indexRouter = require('./routes/index');
var authRouter = require('./routes/authRoutes'); // 👈 Thêm router đăng ký / đăng nhập
var categoryRoutes = require("./routes/categoryRoutes");
var bannerRoutes = require("./routes/bannerRoutes");
var adminRoutes = require("./routes/adminRoutes");
var shoesRoutes = require("./routes/shoesRoutes"); // 👈 router sản phẩm
var userRoutes = require('./routes/userRoutes'); // 🆕 user routes
var orderRoutes = require('./routes/orderRoutes');
var messageRoutes = require('./routes/messageRoutes');
var reviewRoutes = require('./routes/reviewRoutes');
var voucherRoutes = require('./routes/voucherRoutes');
var analyticsRoutes = require('./routes/analyticsRoutes');

var database = require('./config/db');

var app = express();

// ✅ Kết nối MongoDB
database.connect();

// ✅ Middleware
app.use(logger('dev'));
app.use(cors()); // Cho phép gọi từ React Native
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Định nghĩa routes
//Tài khoản Admin
app.use("/admin", adminRoutes);
app.use('/', indexRouter);
app.use('/api/auth', authRouter); // /api/auth/register, /api/auth/login
// 🧩 Routes danh mục
app.use("/api/categories", categoryRoutes);
//Banner
app.use("/api/banners", bannerRoutes);
//Sản phẩm
// 🛍️ Routes sản phẩm giày
app.use("/api/products", shoesRoutes);
app.use('/api/users', userRoutes); // 🆕 danh sách người dùng
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/images', express.static(path.join(__dirname, 'public/images'))); // public/images → /images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Bắt lỗi 404
app.use(function (req, res, next) {
  res.status(404).json({ message: 'Không tìm thấy trang!' });
});

// ✅ Xử lý lỗi chung
app.use(function (err, req, res, next) {
  console.error('🔥 Lỗi:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Lỗi server!',
  });
});

// ✅ Mặc định route chính trả về JSON để tránh lỗi view engine
app.get("/", (req, res) => {
  res.json({ message: "API server đang chạy!" });
});


module.exports = app;
