const mongoose = require('mongoose');

const reviewItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shoes' },
  name: String,
  size: String,
  color: String,
  qty: { type: Number, default: 1 },
  price: { type: Number, default: 0 },
  image: String,
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5, index: true },
  comment: { type: String, default: '' },
  items: { type: [reviewItemSchema], default: [] },
}, { timestamps: true });

// Index để tránh đánh giá trùng lặp cho cùng một đơn hàng
reviewSchema.index({ orderId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);

