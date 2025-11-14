const express = require("express");
const router = express.Router();
const Category = require("../model/Category"); // ⚠️ đổi đúng đường dẫn nếu bạn để trong /models/

// 🟢 Lấy tất cả danh mục (có thể lọc theo isActive)
router.get("/", async (req, res) => {
    try {
        const { active } = req.query; // ?active=true để chỉ lấy danh mục đang hiển thị
        let query = {};
        if (active === 'true') {
            query = { isActive: true };
        }
        const categories = await Category.find(query).sort({ createdAt: -1 });
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

        const newCategory = new Category({ name, description, isActive: true });
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

// 🔴 Ẩn/Hiện danh mục (thay vì xóa)
router.patch("/:id/toggle-visibility", async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ message: "Không tìm thấy danh mục!" });

        // Đảo ngược trạng thái isActive
        category.isActive = !category.isActive;
        await category.save();

        const message = category.isActive ? "Hiển thị danh mục thành công!" : "Ẩn danh mục thành công!";
        res.status(200).json({ message, category });
    } catch (error) {
        console.error("❌ Lỗi cập nhật trạng thái danh mục:", error.message);
        res.status(500).json({ message: "Không thể cập nhật trạng thái danh mục!" });
    }
});

module.exports = router;
