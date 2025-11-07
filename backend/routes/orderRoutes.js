const express = require('express');
const mongoose = require('mongoose');
const Order = require('../model/Order');
const router = express.Router();

// Normalize query
const normalize = (s = '') => String(s).trim().toLowerCase();

// GET /api/orders?q=&status=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { q = '', status = '', page = 1, limit = 10 } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (q) {
      const like = new RegExp(q, 'i');
      filters.$or = [
        { code: like },
        { address: like },
        { payment: like },
        { 'items.name': like },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Order.find(filters).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments(filters),
    ]);

    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/:id => Chi tiết order kèm voucher discount
router.get('/:id', async (req, res) => {
  try {
    const ord = await Order.findById(req.params.id);
    if (!ord) return res.status(404).json({ message: 'Not found' });

    let voucherInfo = null;
    const Voucher = require('../model/Voucher');

    if (ord.voucherCode) {
      const voucher = await Voucher.findOne({ code: ord.voucherCode.toUpperCase() });
      if (voucher) {
        const totalAmount = ord.items.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
        let discountTotal = 0;

        if (voucher.categoryIds && voucher.categoryIds.length > 0) {
          const applicableItems = ord.items.filter(item =>
            item.categoryId && voucher.categoryIds.map(id => String(id)).includes(String(item.categoryId))
          );
          const applicableAmount = applicableItems.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);

          if (voucher.discountType === 'percent') {
            discountTotal = Math.round((applicableAmount * voucher.discountValue) / 100);
            if (voucher.maxDiscountAmount > 0 && discountTotal > voucher.maxDiscountAmount)
              discountTotal = voucher.maxDiscountAmount;
          } else {
            discountTotal = voucher.discountValue;
          }
        } else {
          if (voucher.discountType === 'percent') {
            discountTotal = Math.round((totalAmount * voucher.discountValue) / 100);
            if (voucher.maxDiscountAmount > 0 && discountTotal > voucher.maxDiscountAmount)
              discountTotal = voucher.maxDiscountAmount;
          } else {
            discountTotal = voucher.discountValue;
          }
        }

        voucherInfo = { code: voucher.code, discountApplied: discountTotal };

        // Phân bổ discount cho từng item theo tỉ lệ giá
        const totalItemAmount = ord.items.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
        ord.items = ord.items.map(item => {
          const itemAmount = item.price * (item.qty || 1);
          const itemDiscount = totalItemAmount > 0 ? Math.round((itemAmount / totalItemAmount) * discountTotal) : 0;
          return { ...item.toObject(), discount: itemDiscount, discountAmount: itemDiscount };
        });
      }
    } else {
      ord.items = ord.items.map(item => ({ ...item.toObject(), discount: 0, discountAmount: 0 }));
    }

    res.json({ ...ord.toObject(), voucher: voucherInfo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const oldOrder = await Order.findById(orderId);
    if (!oldOrder) return res.status(404).json({ message: 'Not found' });

    const ord = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

    // Nếu đổi thành "Đã giao hàng" và trạng thái cũ không phải "Đã giao hàng" → trừ stock + tăng voucher usedCount + gửi tin nhắn
    if (status === 'Đã giao hàng' && oldOrder.status !== 'Đã giao hàng') {
      const { ProductVariant } = require('../model/Shoes');
      const Product = mongoose.model('Product');
      const Voucher = require('../model/Voucher');
      const Message = require('../model/Message');

      if (ord.voucherCode) {
        const voucher = await Voucher.findOne({ code: ord.voucherCode.toUpperCase() });
        if (voucher && voucher.usedCount < voucher.quantity) {
          voucher.usedCount += 1;
          await voucher.save();
        }
      }

      for (const item of ord.items) {
        try {
          let variant = null;
          if (item.productId) {
            variant = await ProductVariant.findOne({
              productId: item.productId,
              color: item.color,
              size: item.size,
            });
            if (!variant) variant = await ProductVariant.findById(item.productId);
          } else if (item.name && item.color && item.size) {
            const product = await Product.findOne({ name: item.name });
            if (product) {
              variant = await ProductVariant.findOne({
                productId: product._id,
                color: item.color,
                size: item.size,
              });
            }
          }

          if (variant) {
            const qtyToReduce = item.qty || 1;
            variant.stock = Math.max(0, (variant.stock || 0) - qtyToReduce);
            if (variant.stock === 0) variant.status = 'Hết hàng';
            else if (variant.status === 'Hết hàng' && variant.stock > 0) variant.status = 'Còn hàng';
            await variant.save();
          }
        } catch (err) {
          console.error('Error reducing stock:', err);
        }
      }

      // Tự động gửi tin nhắn thông báo đơn hàng đã giao thành công
      try {
        const User = mongoose.model('User');
        const user = await User.findById(ord.userId);
        if (user) {
          const adminId = 'admin_001';
          const adminName = 'Admin';
          const messageText = `Đơn hàng ${ord.code || ord._id} của bạn đã được giao thành công! Cảm ơn bạn đã mua sắm tại cửa hàng chúng tôi.`;
          
          const notificationMessage = new Message({
            senderId: adminId,
            senderName: adminName,
            senderType: 'admin',
            receiverId: String(user._id),
            receiverName: user.name || 'Khách hàng',
            message: messageText,
            read: false
          });
          
          await notificationMessage.save();
          console.log(`✅ Đã gửi tin nhắn thông báo đơn hàng đã giao cho user ${user._id}`);
        }
      } catch (msgErr) {
        console.error('Error sending delivery notification message:', msgErr);
        // Không throw error để không ảnh hưởng đến việc cập nhật trạng thái đơn hàng
      }
    }

    res.json(ord);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const ord = await Order.findByIdAndDelete(req.params.id);
    if (!ord) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    body.code = body.code || `ORD-${Date.now()}`;

    if (Array.isArray(body.items)) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        if (item.productId && !item.image) {
          const variant = await mongoose.model('ProductVariant').findById(item.productId);
          if (variant && variant.image) item.image = variant.image;
        }
        if (!item.discountAmount) item.discountAmount = 0;
      }
    }

    const ord = await Order.create(body);
    res.status(201).json(ord);
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: 'Bad request' });
  }
});

// GET /api/users/:userId/orders
router.get('/user/:userId/list', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    const Voucher = require('../model/Voucher');

    const data = await Promise.all(
      orders.map(async ord => {
        let voucherInfo = null;
        let discountTotal = 0;

        if (ord.voucherCode) {
          const voucher = await Voucher.findOne({ code: ord.voucherCode.toUpperCase() });
          if (voucher) {
            const totalAmount = ord.items.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);

            if (voucher.categoryIds && voucher.categoryIds.length > 0) {
              const applicableItems = ord.items.filter(item =>
                item.categoryId && voucher.categoryIds.map(id => String(id)).includes(String(item.categoryId))
              );
              const applicableAmount = applicableItems.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);

              if (voucher.discountType === 'percent') {
                discountTotal = Math.round((applicableAmount * voucher.discountValue) / 100);
                if (voucher.maxDiscountAmount > 0 && discountTotal > voucher.maxDiscountAmount)
                  discountTotal = voucher.maxDiscountAmount;
              } else {
                discountTotal = voucher.discountValue;
              }
            } else {
              if (voucher.discountType === 'percent') {
                discountTotal = Math.round((totalAmount * voucher.discountValue) / 100);
                if (voucher.maxDiscountAmount > 0 && discountTotal > voucher.maxDiscountAmount)
                  discountTotal = voucher.maxDiscountAmount;
              } else {
                discountTotal = voucher.discountValue;
              }
            }

            voucherInfo = { code: voucher.code, discountApplied: discountTotal };

            const totalItemAmount = ord.items.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
            ord.items = ord.items.map(item => {
              const itemAmount = item.price * (item.qty || 1);
              const itemDiscount = totalItemAmount > 0 ? Math.round((itemAmount / totalItemAmount) * discountTotal) : 0;
              return { ...item, discount: itemDiscount, discountAmount: itemDiscount };
            });
          }
        } else {
          ord.items = ord.items.map(item => ({ ...item, discount: 0, discountAmount: 0 }));
        }

        return { ...ord.toObject(), voucher: voucherInfo };
      })
    );

    res.json({ data, total: data.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
