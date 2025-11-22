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
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shoes', index: true }, // ID sản phẩm được đánh giá
  itemIdentifier: { type: String, index: true }, // Identifier duy nhất: productId_color_size
  rating: { type: Number, required: true, min: 1, max: 5, index: true },
  comment: { type: String, default: '' },
  items: { type: [reviewItemSchema], default: [] },
}, { timestamps: true });

// Index để tránh đánh giá trùng lặp cho cùng một sản phẩm trong cùng một đơn hàng
// Sử dụng itemIdentifier để tạo unique key chính xác hơn
reviewSchema.index({ orderId: 1, userId: 1, itemIdentifier: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', reviewSchema);

