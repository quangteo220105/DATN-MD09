const express = require('express');
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
    const ord = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ord) return res.status(404).json({ message: 'Not found' });
    res.json(ord);
  } catch (e) {
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


