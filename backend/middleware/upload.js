// 📁 backend/middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ Tạo folder backend/uploads nếu chưa có
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Cấu hình lưu file vào uploads/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const fileName = Date.now() + ext;
        cb(null, fileName);
    },
});

// ✅ Kiểm tra định dạng file ảnh
const fileFilter = (req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|gif|webp|avif/;
    const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png|gif|webp|avif)/.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error("Chỉ được upload file ảnh!"), false);
    }
};

// ✅ Cấu hình multer
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
