const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shoes' },
  name: String,
  size: String,
  color: String,
  qty: { type: Number, default: 1 },
  price: { type: Number, default: 0 },
  image: String,
  discountAmount: { type: Number, default: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  code: { type: String, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  customerName: { type: String },
  customerPhone: { type: String },
  items: { type: [orderItemSchema], default: [] },
  total: { type: Number, default: 0 },
  voucherCode: { type: String }, // Mã voucher đã sử dụng
  discount: { type: Number, default: 0 }, // Số tiền đã giảm
  address: { type: String },
  payment: { type: String, default: 'cod' },
  status: { type: String, enum: ['Chờ xác nhận', 'Chờ thanh toán', 'Đã xác nhận', 'Đang giao hàng', 'Đã giao hàng', 'Đã hủy'], default: 'Chờ xác nhận', index: true },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);


