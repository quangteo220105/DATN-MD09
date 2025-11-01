const express = require('express');
const Order = require('../model/Order');
const mongoose = require('mongoose');
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
      const like = new RegExp(req.query.q, 'i');
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
      Order.countDocuments(filters)
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const ord = await Order.findById(req.params.id);
    if (!ord) return res.status(404).json({ message: 'Not found' });
    res.json(ord);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    
    // Lấy order hiện tại để kiểm tra trạng thái cũ
    const oldOrder = await Order.findById(orderId);
    if (!oldOrder) return res.status(404).json({ message: 'Not found' });
    
    // Cập nhật trạng thái
    const ord = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    
    // Nếu đổi thành "Đã giao hàng" và trạng thái cũ không phải "Đã giao hàng" → trừ stock
    if (status === 'Đã giao hàng' && oldOrder.status !== 'Đã giao hàng') {
      const { ProductVariant } = require('../model/Shoes');
      const Product = mongoose.model('Product');
      
      // Duyệt qua tất cả items trong order
      if (ord.items && Array.isArray(ord.items) && ord.items.length > 0) {
        for (const item of ord.items) {
          try {
            let variant = null;
            
            if (item.productId) {
              // productId trong Order.items thường là Product ID chính (từ product._id)
              // Tìm variant theo productId + color + size
              variant = await ProductVariant.findOne({
                productId: item.productId,
                color: item.color,
                size: item.size
              });
              
              // Nếu không tìm thấy, thử tìm variant trực tiếp theo ID (fallback)
              if (!variant) {
                variant = await ProductVariant.findById(item.productId);
              }
            } else if (item.name && item.color && item.size) {
              // Fallback: Tìm variant theo tên sản phẩm + color + size
              const product = await Product.findOne({ name: item.name });
              if (product) {
                variant = await ProductVariant.findOne({
                  productId: product._id,
                  color: item.color,
                  size: item.size
                });
              }
            }
            
            if (variant) {
              const qtyToReduce = item.qty || 1;
              const oldStock = variant.stock || 0;
              
              // Trừ stock (đảm bảo không âm)
              variant.stock = Math.max(0, oldStock - qtyToReduce);
              
              // Cập nhật status nếu hết hàng
              if (variant.stock === 0) {
                variant.status = 'Hết hàng';
              } else if (variant.status === 'Hết hàng' && variant.stock > 0) {
                variant.status = 'Còn hàng';
              }
              
              await variant.save();
              console.log(`✅ Đã trừ ${qtyToReduce} sản phẩm từ variant ${variant._id} (${variant.color}/${variant.size}). Stock: ${oldStock} → ${variant.stock}`);
            } else {
              console.warn(`⚠️ Không tìm thấy variant cho item:`, {
                productId: item.productId,
                name: item.name,
                color: item.color,
                size: item.size
              });
            }
          } catch (itemError) {
            console.error(`❌ Lỗi khi trừ stock cho item:`, item, itemError);
            // Tiếp tục xử lý các item khác
          }
        }
      }
    }
    
    res.json(ord);
  } catch (e) {
    console.error('Error updating order status:', e);
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
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/orders (create)
// POST /api/orders (create)
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    body.code = body.code || `ORD-${Date.now()}`;

    // ✅ Bổ sung: tự động gán ảnh sản phẩm nếu chưa có
    if (Array.isArray(body.items)) {
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        // Nếu item có productId mà chưa có image → lấy từ ProductVariant
        if (item.productId && !item.image) {
          const variant = await mongoose.model("ProductVariant").findById(item.productId);
          if (variant && variant.image) {
            item.image = variant.image; // ✅ Gán ảnh từ sản phẩm
          }
        }
      }
    }

    const ord = await Order.create(body);
    res.status(201).json(ord);
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: 'Bad request' });
  }
});


// GET /api/users/:userId/orders (list orders for a user)
router.get('/user/:userId/list', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await Order.find({ userId }).sort({ createdAt: -1 });
    res.json({ data, total: data.length });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


