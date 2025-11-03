const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true },
        name: { type: String, required: true },
        description: { type: String },
        discountType: { 
            type: String, 
            enum: ['percent', 'fixed'], 
            required: true 
        },
        discountValue: { type: Number, required: true }, // Giá trị giảm
        minOrderAmount: { type: Number, default: 0 }, // Đơn hàng tối thiểu
        maxDiscountAmount: { type: Number, default: 0 }, // Giảm tối đa (cho percent)
        categoryIds: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // Danh mục áp dụng (rỗng = tất cả)
        quantity: { type: Number, required: true }, // Số lượng voucher
        usedCount: { type: Number, default: 0 }, // Đã sử dụng
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        isActive: { type: Boolean, default: true },
        createdBy: { type: String, default: 'Admin' }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Voucher", voucherSchema);
