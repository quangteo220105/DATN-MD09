const express = require("express");
const router = express.Router();
const Category = require("../model/Category"); // ⚠️ đổi đúng đường dẫn nếu bạn để trong /models/

// 🟢 Lấy tất cả danh mục
router.get("/", async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.status(200).json(categories);
    } catch (error) {
        console.error("❌ Lỗi lấy danh mục:", error.message);
        res.status(500).json({ message: "Không thể lấy danh mục!" });
    }
});

// 🟢 Thêm danh mục
router.post("/", async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Tên danh mục không được để trống!" });
        }

        const existing = await Category.findOne({ name });
        if (existing) {
            return res.status(400).json({ message: "Danh mục đã tồn tại!" });
        }

        const newCategory = new Category({ name, description });
        await newCategory.save();

        res.status(201).json({ message: "Thêm danh mục thành công!", category: newCategory });
    } catch (error) {
        console.error("❌ Lỗi thêm danh mục:", error.message);
        res.status(500).json({ message: "Không thể thêm danh mục!" });
    }
});

// 🟡 Sửa danh mục
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const updated = await Category.findByIdAndUpdate(
            id,
            { name, description },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: "Không tìm thấy danh mục!" });

        res.status(200).json({ message: "Cập nhật thành công!", category: updated });
    } catch (error) {
        console.error("❌ Lỗi cập nhật danh mục:", error.message);
        res.status(500).json({ message: "Không thể cập nhật danh mục!" });
    }
});

// 🔴 Xóa danh mục
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Category.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: "Không tìm thấy danh mục!" });

        res.status(200).json({ message: "Xóa danh mục thành công!" });
    } catch (error) {
        console.error("❌ Lỗi xóa danh mục:", error.message);
        res.status(500).json({ message: "Không thể xóa danh mục!" });
    }
});

module.exports = router;
