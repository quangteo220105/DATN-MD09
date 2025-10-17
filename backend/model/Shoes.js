const mongoose = require("mongoose");

// Sản phẩm chính
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    brand: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Biến thể sản phẩm
const productVariantSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    color: { type: String, required: true },
    size: { type: Number, required: true },
    originalPrice: { type: Number, required: true }, // Giá gốc, KHÔNG được sửa
    currentPrice: { type: Number, required: true },  // Giá bán hiện tại, bắt buộc nhập
    stock: { type: Number, required: true },         // Số lượng tồn kho, bắt buộc
    image: { type: String, required: true },
    status: { type: String, enum: ["Còn hàng", "Hết hàng"], default: "Còn hàng" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = {
    Product: mongoose.model("Product", productSchema),
    ProductVariant: mongoose.model("ProductVariant", productVariantSchema)
};
