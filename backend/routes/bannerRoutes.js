const express = require("express");
const router = express.Router();
const Banner = require("../model/Banner");

// 🟢 Lấy tất cả banner
router.get("/", async (req, res) => {
    try {
        const banners = await Banner.find();
        res.status(200).json(banners);
    } catch (error) {
        res.status(500).json({ message: "Lỗi lấy danh sách banner", error: error.message });
    }
});

// 🟢 Thêm banner
router.post("/", async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ message: "Vui lòng cung cấp đường dẫn ảnh" });
        }

        const newBanner = new Banner({ image });
        await newBanner.save();
        res.status(201).json({ message: "Thêm banner thành công", banner: newBanner });
    } catch (error) {
        res.status(500).json({ message: "Lỗi thêm banner", error: error.message });
    }
});

// 🟢 Cập nhật banner
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { image } = req.body;

        const updated = await Banner.findByIdAndUpdate(id, { image }, { new: true });
        if (!updated) {
            return res.status(404).json({ message: "Không tìm thấy banner để cập nhật" });
        }

        res.status(200).json({ message: "Cập nhật banner thành công", banner: updated });
    } catch (error) {
        res.status(500).json({ message: "Lỗi cập nhật banner", error: error.message });
    }
});

// 🟢 Xóa banner
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Banner.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: "Không tìm thấy banner để xóa" });
        }

        res.status(200).json({ message: "Xóa banner thành công" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi xóa banner", error: error.message });
    }
});

module.exports = router;
