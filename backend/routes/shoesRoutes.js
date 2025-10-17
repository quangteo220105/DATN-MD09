const express = require("express");
const router = express.Router();
const { Product, ProductVariant } = require("../model/Shoes");
const upload = require("../config/upload"); // multer

// 🟢 Lấy danh sách tất cả sản phẩm (hiển thị ra Dashboard hoặc người dùng)
// ==========================
router.get("/", async (req, res) => {
    try {
        const products = await Product.find().lean();

        // Gắn thêm biến thể (nếu cần)
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
// 🟢 Hiển thị danh sách sản phẩm (ngoài)
// ==========================


// ==========================
// 🟢 Hiển thị chi tiết sản phẩm (bên trong)
// ==========================
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

        const variants = await ProductVariant.find({ productId: product._id });

        res.status(200).json({
            _id: product._id,
            name: product.name,
            brand: product.brand,
            description: product.description,
            category: product.categoryId || null,
            isActive: product.isActive,
            variants
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lấy chi tiết sản phẩm thất bại" });
    }
});

// ==========================
// 🟢 Thêm sản phẩm + biến thể (chỉ 1 hoặc nhiều ảnh)
// ==========================
router.post("/", upload.any(), async (req, res) => {
    try {
        console.log("🧩 BODY:", req.body);
        console.log("🖼️ FILES:", req.files);

        const { name, description, brand, categoryId, isActive } = req.body;

        // ✅ Parse variants từ JSON string
        let variants = [];
        if (req.body.variants) {
            try {
                variants = typeof req.body.variants === "string"
                    ? JSON.parse(req.body.variants)
                    : req.body.variants;
            } catch (e) {
                return res.status(400).json({ message: "Dữ liệu variants không hợp lệ!" });
            }
        }

        // ✅ Kiểm tra thông tin bắt buộc
        if (!name || !categoryId || !variants.length) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
        }

        // ✅ Tạo sản phẩm chính
        const newProduct = new Product({
            name,
            description,
            brand,
            categoryId,
            isActive: isActive !== undefined ? isActive : true,
        });
        await newProduct.save();

        // ✅ Duyệt và tạo biến thể
        const savedVariants = [];

        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];

            // Kiểm tra thông tin bắt buộc của biến thể
            if (!v.color || !v.size || !v.originalPrice || !v.currentPrice) {
                return res.status(400).json({ message: `Biến thể thứ ${i + 1} thiếu thông tin bắt buộc!` });
            }

            // Tìm file tương ứng theo màu hoặc index
            let file = req.files[i];
            const newVariant = new ProductVariant({
                productId: newProduct._id,
                color: v.color,
                size: v.size,
                originalPrice: v.originalPrice,
                currentPrice: v.currentPrice,
                stock: v.stock !== undefined ? v.stock : 0,
                status: v.status || "Còn hàng",
                image: file ? `/images/${file.filename}` : "",
            });

            await newVariant.save();
            savedVariants.push(newVariant);
        }

        return res.status(201).json({
            message: "Thêm sản phẩm thành công!",
            product: newProduct,
            variants: savedVariants,
        });
    } catch (error) {
        console.error("❌ Lỗi thêm sản phẩm:", error);
        return res.status(500).json({ message: "Không thể thêm sản phẩm!" });
    }
});

//Sửa sản phẩm

router.put("/:id", upload.any(), async (req, res) => {
    try {
        const { id } = req.params;
        console.log("🧩 BODY:", req.body);
        console.log("🖼️ FILES:", req.files);

        const { name, description, brand, categoryId, isActive, variants } = req.body;

        // ✅ Cập nhật sản phẩm chính
        const updateProductData = { updatedAt: new Date() };
        if (name) updateProductData.name = name;
        if (description) updateProductData.description = description;
        if (brand) updateProductData.brand = brand;
        if (categoryId) updateProductData.categoryId = categoryId;
        if (isActive !== undefined) updateProductData.isActive = isActive;

        const updatedProduct = await Product.findByIdAndUpdate(id, updateProductData, { new: true });
        if (!updatedProduct) return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });

        // ✅ Cập nhật biến thể (nếu có gửi)
        let savedVariants = [];
        if (variants) {
            let variantsData;
            try {
                variantsData = typeof variants === "string" ? JSON.parse(variants) : variants;
            } catch (e) {
                return res.status(400).json({ message: "Dữ liệu variants không hợp lệ!" });
            }

            for (let i = 0; i < variantsData.length; i++) {
                const v = variantsData[i];

                // Biến thể phải có ID để biết update
                if (!v._id) continue;

                const updateVariantData = {};
                if (v.color) updateVariantData.color = v.color;
                if (v.size) updateVariantData.size = v.size;
                if (v.currentPrice !== undefined) updateVariantData.currentPrice = v.currentPrice;
                if (v.stock !== undefined) updateVariantData.stock = v.stock;
                if (v.status) updateVariantData.status = v.status;

                // Nếu có file ảnh gửi kèm, lấy file tương ứng
                let file = req.files.find(f => f.fieldname === `image-${i}`);
                if (file) updateVariantData.image = `/images/${file.filename}`;

                const updatedVariant = await ProductVariant.findByIdAndUpdate(v._id, updateVariantData, { new: true });
                if (updatedVariant) savedVariants.push(updatedVariant);
            }
        }

        return res.status(200).json({
            message: "Cập nhật sản phẩm thành công!",
            product: updatedProduct,
            variants: savedVariants
        });

    } catch (error) {
        console.error("❌ Lỗi cập nhật sản phẩm:", error);
        return res.status(500).json({ message: "Không thể cập nhật sản phẩm!" });
    }
});
// ==========================
// 🔴 Xóa sản phẩm + biến thể
// ==========================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });

        await ProductVariant.deleteMany({ productId: id });

        res.status(200).json({ message: "Xóa sản phẩm và biến thể thành công!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Xóa sản phẩm thất bại" });
    }
});

module.exports = router;
