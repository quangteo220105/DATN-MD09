const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { Product, ProductVariant } = require("../model/Shoes");
const upload = require("../config/upload");

// ==========================
// 🟢 Lấy danh sách sản phẩm
// ==========================
router.get("/", async (req, res) => {
    try {
        const products = await Product.find().lean();

        const result = await Promise.all(
            products.map(async (p) => {
                const variants = await ProductVariant.find({ productId: p._id });
                return { ...p, variants };
            })
        );

        res.status(200).json(result);
    } catch (err) {
        console.error("❌ Lỗi lấy danh sách sản phẩm:", err);
        res.status(500).json({ message: "Không thể lấy danh sách sản phẩm!" });
    }
});

// ==========================
// 🟢 Lấy chi tiết sản phẩm
// ==========================
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

        const variants = await ProductVariant.find({ productId: product._id });

        res.status(200).json({
            ...product.toObject(),
            variants,
        });
    } catch (err) {
        console.error("❌ Lỗi lấy chi tiết:", err);
        res.status(500).json({ message: "Lấy chi tiết sản phẩm thất bại" });
    }
});

// ==========================
// 🟢 Thêm sản phẩm + biến thể
// ==========================
router.post("/", upload.any(), async (req, res) => {
    try {
        const { name, description, brand, categoryId, isActive } = req.body;

        let variants = [];
        if (req.body.variants) {
            variants = typeof req.body.variants === "string"
                ? JSON.parse(req.body.variants)
                : req.body.variants;
        }

        if (!name || !categoryId || variants.length === 0) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
        }

        // 🟢 Tạo sản phẩm
        const newProduct = await Product.create({
            name,
            description,
            brand,
            categoryId,
            isActive: isActive !== undefined ? isActive : true,
        });

        // 🟢 Thêm biến thể
        const savedVariants = [];
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            const file = req.files.find(f => f.fieldname === `image-${i}`);

            if (!v.color || !v.size || v.currentPrice === undefined) {
                continue;
            }

            const newVariant = new ProductVariant({
                productId: newProduct._id,
                color: v.color,
                size: v.size,
                originalPrice: v.originalPrice || v.currentPrice,
                currentPrice: v.currentPrice,
                stock: v.stock || 0,
                status: v.status || "Còn hàng",
                image: file ? `/images/${file.filename}` : "",
            });

            await newVariant.save();
            savedVariants.push(newVariant);
        }

        res.status(201).json({
            message: "✅ Thêm sản phẩm thành công!",
            product: newProduct,
            variants: savedVariants,
        });
    } catch (error) {
        console.error("❌ Lỗi thêm sản phẩm:", error);
        res.status(500).json({ message: "Không thể thêm sản phẩm!" });
    }
});

// ==========================
// 🟡 Cập nhật sản phẩm + biến thể
// ==========================
router.put("/:id", upload.any(), async (req, res) => {
    try {
        console.log("🟡 PUT BODY:", req.body);
        console.log("🟡 PUT FILES:", req.files?.map(f => f.fieldname));

        const { name, description, brand, categoryId, isActive, replaceVariants } = req.body;
        const productId = req.params.id;

        // 🟢 Tìm sản phẩm
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
        }

        // 🟢 Cập nhật thông tin sản phẩm
        if (name) product.name = name;
        if (description) product.description = description;
        if (brand) product.brand = brand;
        if (categoryId) product.categoryId = categoryId;
        if (isActive !== undefined) product.isActive = isActive === "true";

        await product.save();

        // 🟢 Parse danh sách biến thể (variants)
        let variants = [];
        try {
            variants = typeof req.body.variants === "string"
                ? JSON.parse(req.body.variants)
                : req.body.variants;
        } catch (err) {
            console.error("❌ Lỗi parse variants:", err);
            return res.status(400).json({ success: false, message: "Dữ liệu biến thể không hợp lệ!" });
        }

        // 🔄 Nếu replaceVariants = true → thay thế toàn bộ biến thể cũ
        if (replaceVariants === "true") {
            console.log("🔄 Thay thế toàn bộ biến thể...");

            // Lấy danh sách cũ để giữ ảnh nếu cần
            const oldVariants = await ProductVariant.find({ productId });

            // Xóa toàn bộ biến thể cũ
            await ProductVariant.deleteMany({ productId });

            const newVariants = [];
            for (let i = 0; i < variants.length; i++) {
                const v = variants[i];
                let file = req.files?.find(f => f.fieldname === `image-${i}`) || null;

                // Giữ ảnh cũ nếu không upload ảnh mới
                let oldImage = oldVariants[i]?.image || "";

                if (!v.color || !v.size || !v.currentPrice) continue;

                const newVariant = new ProductVariant({
                    productId,
                    color: v.color,
                    size: v.size,
                    originalPrice: v.originalPrice || v.currentPrice,
                    currentPrice: v.currentPrice,
                    stock: v.stock || 0,
                    status: v.status || "Còn hàng",
                    image: file ? `/images/${file.filename}` : v.image || oldImage, // ✅ Giữ lại ảnh cũ nếu không có mới
                });

                await newVariant.save();
                newVariants.push(newVariant);
            }

            return res.json({
                success: true,
                message: "✅ Cập nhật sản phẩm & thay thế biến thể thành công!",
                product,
                variants: newVariants,
            });
        }

        // 🟢 Nếu không replaceVariants → cập nhật hoặc thêm biến thể mới
        const updatedVariants = [];
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            let file = req.files?.find(f => f.fieldname === `image-${i}`) || null;

            if (v._id) {
                // 🔸 Cập nhật biến thể cũ
                const existing = await ProductVariant.findById(v._id);
                if (existing) {
                    // Xóa ảnh cũ nếu upload ảnh mới
                    if (file && existing.image) {
                        const oldPath = path.join(__dirname, "../public", existing.image);
                        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    }

                    existing.color = v.color || existing.color;
                    existing.size = v.size || existing.size;
                    existing.originalPrice = v.originalPrice || v.currentPrice || existing.originalPrice;
                    existing.currentPrice = v.currentPrice || existing.currentPrice;
                    existing.stock = v.stock ?? existing.stock;
                    existing.status = v.status || existing.status;
                    existing.image = file
                        ? `/images/${file.filename}`
                        : v.image || existing.image; // ✅ Giữ ảnh cũ

                    await existing.save();
                    updatedVariants.push(existing);
                }
            } else {
                // 🔹 Thêm mới biến thể
                if (!v.color || !v.size || !v.currentPrice) continue;

                const newVariant = new ProductVariant({
                    productId,
                    color: v.color,
                    size: v.size,
                    originalPrice: v.originalPrice || v.currentPrice,
                    currentPrice: v.currentPrice,
                    stock: v.stock || 0,
                    status: v.status || "Còn hàng",
                    image: file ? `/images/${file.filename}` : v.image || "", // ✅ an toàn hơn
                });

                // Nếu không có ảnh (v.image rỗng) thì bỏ qua, tránh lỗi validation
                if (!newVariant.image) {
                    console.warn(`⚠️ Bỏ qua biến thể thiếu ảnh: ${v.color} - ${v.size}`);
                    continue;
                }

                await newVariant.save();
                updatedVariants.push(newVariant);
            }
        }

        res.json({
            success: true,
            message: "✅ Cập nhật sản phẩm thành công!",
            product,
            variants: updatedVariants,
        });

    } catch (error) {
        console.error("❌ PUT /:id Error:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật sản phẩm!",
            error: error.message,
        });
    }
});

// ==========================
// 🟠 Toggle dừng bán sản phẩm
// ==========================
router.put("/:id/toggle-stop", async (req, res) => {
    try {
        console.log('🔄 [Toggle Stop] Request received for product:', req.params.id);

        const product = await Product.findById(req.params.id);
        if (!product) {
            console.log('❌ [Toggle Stop] Product not found:', req.params.id);
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        console.log('📦 [Toggle Stop] Current isActive:', product.isActive);

        // Toggle trạng thái isActive
        product.isActive = !product.isActive;
        await product.save();

        console.log('✅ [Toggle Stop] Updated isActive:', product.isActive);

        res.status(200).json({
            success: true,
            message: product.isActive ? "Đã mở lại sản phẩm" : "Đã dừng bán sản phẩm",
            product
        });
    } catch (error) {
        console.error("❌ Lỗi toggle dừng bán:", error);
        res.status(500).json({ message: "Không thể cập nhật trạng thái sản phẩm" });
    }
});

// ==========================
// 🔴 Xóa sản phẩm + biến thể + ảnh
// ==========================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });

        // Xóa ảnh các variant
        const variants = await ProductVariant.find({ productId: id });
        for (const v of variants) {
            if (v.image) {
                const imgPath = path.join(__dirname, "../public", v.image);
                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            }
        }

        await ProductVariant.deleteMany({ productId: id });
        await Product.findByIdAndDelete(id);

        res.status(200).json({ message: "✅ Xóa sản phẩm và ảnh thành công!" });
    } catch (err) {
        console.error("❌ Lỗi xóa sản phẩm:", err);
        res.status(500).json({ message: "Xóa sản phẩm thất bại" });
    }
});

module.exports = router;
