const express = require('express');
const Review = require('../model/Review');
const Order = require('../model/Order');
const User = require('../model/User');
const router = express.Router();

// Normalize query
const normalize = (s = '') => String(s).trim().toLowerCase();

// GET /api/reviews?q=&rating=&page=&limit=
router.get('/', async (req, res) => {
  try {
    const { q = '', rating = '', page = 1, limit = 10 } = req.query;
    
    // Build match stage cho aggregation
    const matchStage = {};
    
    if (rating) {
      matchStage.rating = Number(rating);
    }
    
    // Nếu có query, tìm User và Order trước
    let userIds = [];
    let orderIds = [];
    
    if (q && q.trim()) {
      const like = new RegExp(req.query.q, 'i');
      
      // Tìm Users khớp với query
      const matchingUsers = await User.find({
        $or: [
          { name: like },
          { phone: like }
        ]
      }).select('_id');
      userIds = matchingUsers.map(u => u._id);
      
      // Tìm Orders khớp với query
      const matchingOrders = await Order.find({
        code: like
      }).select('_id');
      orderIds = matchingOrders.map(o => o._id);
    }
    
    // Build match conditions
    // Nếu có rating, thêm vào matchStage
    if (rating) {
      matchStage.rating = Number(rating);
    }
    
    // Nếu có query, thêm điều kiện tìm kiếm
    if (q && q.trim()) {
      const like = new RegExp(req.query.q, 'i');
      const orConditions = [{ comment: like }];
      
      // Nếu tìm thấy users/orders, thêm vào điều kiện
      if (userIds.length > 0) {
        orConditions.push({ userId: { $in: userIds } });
      }
      if (orderIds.length > 0) {
        orConditions.push({ orderId: { $in: orderIds } });
      }
      
      // Nếu có nhiều điều kiện trong $or, dùng $or, nếu chỉ có 1 thì gán trực tiếp
      if (orConditions.length > 1) {
        matchStage.$or = orConditions;
      } else if (orConditions.length === 1) {
        Object.assign(matchStage, orConditions[0]);
      }
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    // Sử dụng aggregation để populate và filter
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId'
        }
      },
      {
        $unwind: {
          path: '$userId',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'orderId'
        }
      },
      {
        $unwind: {
          path: '$orderId',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          orderId: { _id: '$orderId._id', code: '$orderId.code' },
          userId: { _id: '$userId._id', name: '$userId.name', phone: '$userId.phone' },
          rating: 1,
          comment: 1,
          items: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) }
    ];
    
    const countPipeline = [
      { $match: matchStage },
      { $count: 'total' }
    ];
    
    const [dataResult, countResult] = await Promise.all([
      Review.aggregate(pipeline),
      Review.aggregate(countPipeline)
    ]);
    
    const data = dataResult || [];
    const total = countResult && countResult.length > 0 ? countResult[0].total : 0;
    
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error('GET /api/reviews error:', e);
    res.status(500).json({ message: 'Lỗi lấy danh sách đánh giá' });
  }
});

// GET /api/reviews/:id
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('userId', 'name phone')
      .populate('orderId', 'code _id');
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }
    res.json(review);
  } catch (e) {
    console.error('GET /api/reviews/:id error:', e);
    res.status(500).json({ message: 'Lỗi lấy chi tiết đánh giá' });
  }
});

// GET /api/reviews/order/:orderId
router.get('/order/:orderId', async (req, res) => {
  try {
    const reviews = await Review.find({ orderId: req.params.orderId })
      .populate('userId', 'name phone')
      .populate('orderId', 'code _id')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (e) {
    console.error('GET /api/reviews/order/:orderId error:', e);
    res.status(500).json({ message: 'Lỗi lấy đánh giá theo đơn hàng' });
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  try {
    const { orderId, userId, rating, comment, items } = req.body;
    
    if (!orderId || !userId || !rating) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: orderId, userId, rating' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating phải từ 1 đến 5' });
    }
    
    // Kiểm tra đơn hàng có tồn tại không
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    
    // Kiểm tra đã đánh giá chưa
    const existingReview = await Review.findOne({ orderId, userId });
    if (existingReview) {
      return res.status(400).json({ message: 'Bạn đã đánh giá đơn hàng này rồi' });
    }
    
    const review = new Review({
      orderId,
      userId,
      rating: Number(rating),
      comment: comment || '',
      items: items || []
    });
    
    await review.save();
    
    // Populate để trả về đầy đủ thông tin
    await review.populate('userId', 'name phone');
    await review.populate('orderId', 'code _id');
    
    res.status(201).json(review);
  } catch (e) {
    console.error('POST /api/reviews error:', e);
    if (e.code === 11000) {
      return res.status(400).json({ message: 'Bạn đã đánh giá đơn hàng này rồi' });
    }
    res.status(500).json({ message: 'Lỗi tạo đánh giá' });
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá' });
    }
    res.json({ message: 'Xóa đánh giá thành công' });
  } catch (e) {
    console.error('DELETE /api/reviews/:id error:', e);
    res.status(500).json({ message: 'Lỗi xóa đánh giá' });
  }
});

module.exports = router;

