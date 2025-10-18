const express = require("express");
const router = express.Router();
const Banner = require("../model/Banner");
const upload = require("../middleware/upload");
const fs = require("fs");
const path = require("path");

// 🟢 Lấy danh sách banner
router.get("/", async (req, res) => {
    try {
        const banners = await Banner.find();
        res.status(200).json(banners);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách banner", error: error.message });
    }
});

// 🟢 Thêm banner (upload file)
router.post("/", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Vui lòng chọn ảnh banner" });

        const newBanner = new Banner({
            image: `/uploads/${req.file.filename}`,
        });

        await newBanner.save();
        res.status(201).json({
            message: "Thêm banner thành công",
            banner: newBanner,
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi thêm banner", error: error.message });
    }
});

// 🟢 Cập nhật banner
router.put("/:id", upload.single("image"), async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findById(id);

        if (!banner) return res.status(404).json({ message: "Không tìm thấy banner" });

        // Nếu có file mới thì xóa file cũ
        if (req.file) {
            const oldImagePath = path.join(__dirname, "..", banner.image);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            banner.image = `/uploads/${req.file.filename}`;
        }

        await banner.save();
        res.status(200).json({
            message: "Cập nhật banner thành công",
            banner,
        });
    } catch (error) {
        res.status(500).json({ message: "Lỗi cập nhật banner", error: error.message });
    }
});

// 🟢 Xóa banner
router.delete("/:id", async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) return res.status(404).json({ message: "Không tìm thấy banner để xóa" });

        // Xóa file ảnh nếu tồn tại
        const imagePath = path.join(__dirname, "..", banner.image);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

        res.status(200).json({ message: "Xóa banner thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa banner", error: error.message });
    }
});

module.exports = router;
