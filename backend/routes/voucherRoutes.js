const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Voucher = require("../model/Voucher");

/// 🟢 Lấy danh sách voucher hợp lệ dựa trên giá trị đơn hàng
router.get('/available/:orderAmount', async (req, res) => {
    try {
        const orderAmount = Number(req.params.orderAmount) || 0;

        // Lấy categoryIds từ query (có thể là 1 hoặc nhiều)
        const categoryIds = req.query.categoryIds
            ? Array.isArray(req.query.categoryIds)
                ? req.query.categoryIds
                : req.query.categoryIds.split(',')
            : [];

        const now = new Date();

        // Lấy tất cả voucher đang active
        const vouchers = await Voucher.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $expr: { $lt: ['$usedCount', '$quantity'] }
        }).sort({ createdAt: -1 });

        // Lọc voucher đủ điều kiện
        const availableVouchers = vouchers
            .filter(v => {
                // 1️⃣ Kiểm tra đơn hàng tối thiểu
                if (orderAmount < (v.minOrderAmount || 0)) return false;

                // 2️⃣ Kiểm tra category nếu voucher giới hạn
                if (v.categoryIds && v.categoryIds.length > 0 && categoryIds.length > 0) {
                    const voucherCategoryIdsStr = v.categoryIds.map(id => String(id));
                    const cartCategoryIdsStr = categoryIds.map(id => String(id));
                    const hasMatchingCategory = cartCategoryIdsStr.some(catId =>
                        voucherCategoryIdsStr.includes(catId)
                    );
                    return hasMatchingCategory;
                }

                return true; // voucher không giới hạn category
            })
            .map(v => {
                // Tính discount thực tế
                let discount = 0;
                if (v.discountType === 'percent') {
                    discount = Math.round(orderAmount * v.discountValue / 100);
                    if (v.maxDiscountAmount > 0 && discount > v.maxDiscountAmount) {
                        discount = v.maxDiscountAmount;
                    }
                } else {
                    discount = v.discountValue;
                }

                return {
                    _id: v._id,
                    code: v.code,
                    name: v.name,
                    description: v.description,
                    discountType: v.discountType,
                    discountValue: v.discountValue,
                    maxDiscountAmount: v.maxDiscountAmount || 0,
                    minOrderAmount: v.minOrderAmount || 0,
                    usedCount: v.usedCount,
                    quantity: v.quantity,
                    discount // Giá trị giảm thực tế
                };
            });

        res.status(200).json(availableVouchers);
    } catch (error) {
        console.error("❌ Lỗi lấy danh sách voucher hợp lệ:", error);
        res.status(500).json({ message: "Không thể lấy danh sách voucher!" });
    }
});

// 🟢 Lấy tất cả voucher
router.get("/", async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ createdAt: -1 });
        res.status(200).json(vouchers);
    } catch (error) {
        console.error("❌ Lỗi lấy danh sách voucher:", error.message);
        res.status(500).json({ message: "Không thể lấy danh sách voucher!" });
    }
});

// 🟢 Kiểm tra voucher có hợp lệ không (dùng cho checkout)
router.post('/check', async (req, res) => {
    try {
        const { code, orderAmount, categoryIds } = req.body;

        if (!code) return res.status(400).json({ message: "Mã voucher không được để trống!" });

        const voucher = await Voucher.findOne({ code: code.toUpperCase() });
        if (!voucher) return res.status(404).json({ message: "Mã voucher không tồn tại!" });

        const now = new Date();

        // ✅ Kiểm tra voucher active & thời gian
        if (!voucher.isActive) return res.status(400).json({ message: "Voucher đã bị vô hiệu hóa!" });
        if (now < voucher.startDate) return res.status(400).json({ message: "Voucher chưa bắt đầu!" });
        if (now > voucher.endDate) return res.status(400).json({ message: "Voucher đã hết hạn!" });
        if (voucher.usedCount >= voucher.quantity) return res.status(400).json({ message: "Voucher đã hết lượt sử dụng!" });

        // ✅ Kiểm tra đơn hàng tối thiểu
        if (orderAmount < voucher.minOrderAmount) {
            return res.status(400).json({
                message: `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')} VND để sử dụng voucher này!`
            });
        }

        // ✅ Kiểm tra category nếu voucher giới hạn
        if (voucher.categoryIds && voucher.categoryIds.length > 0) {
            const cartCategoryIds = Array.isArray(categoryIds) ? categoryIds.map(id => String(id)) : [];
            if (cartCategoryIds.length === 0) {
                return res.status(400).json({ message: "Voucher này chỉ áp dụng cho sản phẩm thuộc danh mục được chỉ định!" });
            }

            const voucherCategoryIdsStr = voucher.categoryIds.map(id => String(id));
            const hasMatchingCategory = cartCategoryIds.some(catId => voucherCategoryIdsStr.includes(catId));

            if (!hasMatchingCategory) {
                const categories = await Category.find({ _id: { $in: voucher.categoryIds } });
                const categoryNames = categories.map(c => c.name).join(', ');
                return res.status(400).json({ message: `Voucher này chỉ áp dụng cho danh mục: ${categoryNames}` });
            }
        }

        // ✅ Tính discount thực tế
        let discount = 0;
        if (voucher.discountType === 'percent') {
            discount = Math.round(orderAmount * voucher.discountValue / 100);
            if (voucher.maxDiscountAmount > 0 && discount > voucher.maxDiscountAmount) {
                discount = voucher.maxDiscountAmount;
            }
        } else {
            discount = voucher.discountValue;
        }

        res.status(200).json({
            valid: true,
            voucher: {
                code: voucher.code,
                name: voucher.name,
                description: voucher.description,
                discountValue: voucher.discountValue,
                discountType: voucher.discountType,
                maxDiscountAmount: voucher.maxDiscountAmount
            },
            discount
        });

    } catch (error) {
        console.error("❌ Lỗi kiểm tra voucher:", error);
        res.status(500).json({ message: "Lỗi kiểm tra voucher!" });
    }
});

// 🟢 Thêm voucher
router.post("/", async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscountAmount,
            categoryIds,
            quantity,
            startDate,
            endDate,
            isActive
        } = req.body;

        if (!code || !name || !discountType || !discountValue || !quantity || !startDate || !endDate) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc!" });
        }

        // Kiểm tra mã trùng
        const existing = await Voucher.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ message: "Mã voucher đã tồn tại!" });
        }

        const newVoucher = new Voucher({
            code: code.toUpperCase(),
            name,
            description,
            discountType,
            discountValue,
            minOrderAmount: minOrderAmount || 0,
            maxDiscountAmount: maxDiscountAmount || 0,
            categoryIds: categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0
                ? categoryIds.map(id => new mongoose.Types.ObjectId(id))
                : [],
            quantity,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: isActive !== undefined ? isActive : true
        });

        await newVoucher.save();
        res.status(201).json({ message: "Thêm voucher thành công!", voucher: newVoucher });
    } catch (error) {
        console.error("❌ Lỗi thêm voucher:", error.message);
        res.status(500).json({ message: "Không thể thêm voucher!" });
    }
});

// 🟢 Lấy voucher theo ID
router.get("/:id", async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) {
            return res.status(404).json({ message: "Không tìm thấy voucher!" });
        }
        res.status(200).json(voucher);
    } catch (error) {
        console.error("❌ Lỗi lấy voucher:", error.message);
        res.status(500).json({ message: "Không thể lấy voucher!" });
    }
});

// 🟡 Cập nhật voucher
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            name,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscountAmount,
            categoryIds,
            quantity,
            startDate,
            endDate,
            isActive
        } = req.body;

        const updateData = {
            code: code ? code.toUpperCase() : undefined,
            name,
            description,
            discountType,
            discountValue,
            minOrderAmount,
            maxDiscountAmount,
            quantity,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            isActive
        };

        // Xử lý categoryIds - luôn update ngay cả khi là empty array
        if (categoryIds !== undefined) {
            if (Array.isArray(categoryIds)) {
                updateData.categoryIds = categoryIds.length > 0
                    ? categoryIds.map(id => {
                        try {
                            return new mongoose.Types.ObjectId(id);
                        } catch (e) {
                            console.error('Invalid ObjectId:', id, e);
                            return null;
                        }
                    }).filter(id => id !== null) // Loại bỏ invalid ObjectIds
                    : [];
            } else {
                updateData.categoryIds = [];
            }
        } else {
            // Nếu không gửi categoryIds, giữ nguyên giá trị cũ
            delete updateData.categoryIds;
        }

        // Xóa các field undefined để tránh override
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const updated = await Voucher.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Không tìm thấy voucher!" });
        }

        console.log('✅ Voucher updated:', {
            id: updated._id,
            code: updated.code,
            categoryIds: updated.categoryIds,
            categoryIdsLength: updated.categoryIds?.length
        });

        res.status(200).json({ message: "Cập nhật voucher thành công!", voucher: updated });
    } catch (error) {
        console.error("❌ Lỗi cập nhật voucher:", error.message);
        res.status(500).json({ message: "Không thể cập nhật voucher!" });
    }
});

// 🔴 Xóa voucher
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Voucher.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Không tìm thấy voucher!" });
        }

        res.status(200).json({ message: "Xóa voucher thành công!" });
    } catch (error) {
        console.error("❌ Lỗi xóa voucher:", error.message);
        res.status(500).json({ message: "Không thể xóa voucher!" });
    }
});

// 🟢 Tăng số lượt đã sử dụng (gọi khi user áp dụng voucher thành công)
router.post("/:id/used", async (req, res) => {
    try {
        const { id } = req.params;
        const voucher = await Voucher.findById(id);

        if (!voucher) {
            return res.status(404).json({ message: "Không tìm thấy voucher!" });
        }

        voucher.usedCount += 1;
        await voucher.save();

        res.status(200).json({ message: "Cập nhật số lượt sử dụng thành công!", voucher });
    } catch (error) {
        console.error("❌ Lỗi cập nhật số lượt sử dụng:", error.message);
        res.status(500).json({ message: "Lỗi cập nhật số lượt sử dụng!" });
    }
});

module.exports = router;
