const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../model/User");

// Đăng ký người dùng
router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Kiểm tra trùng email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email đã tồn tại!" });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo user mới
        const newUser = new User({
            name,
            email,
            phone,
            password: hashedPassword,
        });

        await newUser.save();
        res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

// Đăng nhập người dùng
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kiểm tra email có tồn tại không
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Email không tồn tại!" });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu không đúng!" });
        }

        // Trả về thông tin user (có thể thêm token JWT nếu cần)
        res.status(200).json({
            message: "Đăng nhập thành công!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

// Quên mật khẩu
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email không tồn tại!" });
        }

        // Tạo mã reset ngẫu nhiên (6 ký tự)
        const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        user.resetCode = resetCode;
        await user.save();

        // Ở thực tế sẽ gửi mã này qua email, ở đây chỉ trả về để test
        res.status(200).json({
            message: "Mã khôi phục mật khẩu đã được tạo!",
            resetCode, // Trả về để test
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

// Đặt lại mật khẩu mới
router.post("/reset-password", async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Email không tồn tại!" });
        }

        // Kiểm tra mã khôi phục
        if (user.resetCode !== resetCode) {
            return res.status(400).json({ message: "Mã khôi phục không hợp lệ!" });
        }

        // Mã hóa mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetCode = null; // Xóa mã sau khi dùng
        await user.save();

        res.status(200).json({ message: "Đặt lại mật khẩu thành công!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

module.exports = router;
