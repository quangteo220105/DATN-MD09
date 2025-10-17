const express = require("express");
const router = express.Router();
const Admin = require("../model/Admin");
const jwt = require("jsonwebtoken");

// ✅ Khi server chạy, tạo sẵn tài khoản admin mặc định nếu chưa có
(async () => {
    try {
        const defaultEmail = "admin@gmail.com";
        const defaultPassword = "123456";

        const existingAdmin = await Admin.findOne({ email: defaultEmail });
        if (!existingAdmin) {
            await Admin.create({
                email: defaultEmail,
                password: defaultPassword
            });
            console.log("✅ Đã tạo tài khoản admin mặc định:", defaultEmail);
        } else {
            console.log("ℹ️ Admin đã tồn tại, không cần tạo lại.");
        }
    } catch (err) {
        console.error("❌ Lỗi khi tạo admin mặc định:", err);
    }
})();

// 🔐 API: Đăng nhập Admin
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Tìm admin theo email
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
        }

        // Kiểm tra mật khẩu (vì đang lưu plain text)
        if (admin.password !== password) {
            return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
        }

        // Tạo token JWT
        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            "SECRET_KEY",
            { expiresIn: "1d" }
        );

        res.json({ message: "Đăng nhập thành công!", token, admin });
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        res.status(500).json({ message: "Lỗi server!" });
    }
});

module.exports = router;
