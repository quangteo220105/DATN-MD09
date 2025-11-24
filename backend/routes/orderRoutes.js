const express = require('express');
const mongoose = require('mongoose');
const Order = require('../model/Order');
const router = express.Router();

// Normalize query
const normalize = (s = '') => String(s).trim().toLowerCase();

function parseAddressInfo(address, fallbackName = 'Khách hàng', fallbackPhone = '-') {
  if (!address) return { name: fallbackName, phone: fallbackPhone };
  if (typeof address === 'object') {
    return {
      name: address.name || fallbackName,
      phone: address.phone || fallbackPhone,
    };
  }
  const text = String(address);
  // Try JSON
  if (text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        return {
          name: parsed.name || fallbackName,
          phone: parsed.phone || fallbackPhone,
        };
      }
    } catch (err) {
      // ignore parse error
    }
  }
  let name = fallbackName;
  let phone = fallbackPhone;
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const firstLine = lines[0] || '';
  const dashSplit = firstLine.split(/\s*-\s*/);
  if (dashSplit.length >= 2) {
    name = dashSplit[0].trim() || name;
    phone = dashSplit.slice(1).join(' - ').trim() || phone;
  }
  const phoneMatch = text.match(/(\+?84|0)(\d[\s\.\-]?){8,10}/);
  if (phoneMatch) {
    phone = phoneMatch[0].replace(/[\s\.\-]/g, '');
    if (phone.startsWith('84') && phone.length >= 11) {
      phone = '0' + phone.slice(2);
    }
  }
  if ((!name || name === fallbackName) && dashSplit.length === 1 && lines.length > 1) {
    name = firstLine || name;
  }
  return { name: name || fallbackName, phone: phone || fallbackPhone };
}

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

    const mapped = data.map(ord => {
      const { name, phone } = parseAddressInfo(ord.address, ord.customerName, ord.customerPhone);
      return {
        ...ord.toObject(),
        customerName: name || ord.customerName,
        customerPhone: phone || ord.customerPhone,
      };
    });

    const aggregation = await Order.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    const counts = aggregation.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.json({ data: mapped, total, page: Number(page), limit: Number(limit), counts });
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

    // ✅ ƯU TIÊN dùng discount đã lưu trong order thay vì tính lại từ voucher
    // Điều này đảm bảo discount không thay đổi khi voucher bị sửa
    if (ord.voucherCode && ord.discount) {
      // Dùng discount đã lưu
      const discountTotal = ord.discount;
      voucherInfo = { code: ord.voucherCode, discountApplied: discountTotal };

      // Phân bổ discount cho từng item theo tỉ lệ giá (nếu chưa có discountAmount)
      const hasItemDiscount = ord.items.some(item => item.discountAmount && item.discountAmount > 0);

      if (!hasItemDiscount) {
        const totalItemAmount = ord.items.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
        ord.items = ord.items.map(item => {
          const itemAmount = item.price * (item.qty || 1);
          const itemDiscount = totalItemAmount > 0 ? Math.round((itemAmount / totalItemAmount) * discountTotal) : 0;
          return { ...item.toObject(), discount: itemDiscount, discountAmount: itemDiscount };
        });
      } else {
        // Đã có discountAmount → giữ nguyên
        ord.items = ord.items.map(item => ({ ...item.toObject() }));
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

    // Trình tự trạng thái đơn hàng (theo thứ tự)
    const STATUS_SEQUENCE = [
      'Chờ xác nhận',
      'Đã xác nhận',
      'Đang giao hàng',
      'Đã giao hàng'
    ];

    // Kiểm tra nếu đơn đã hủy hoặc đã giao hàng, không cho phép thay đổi (trừ khi hủy)
    if (oldOrder.status === 'Đã hủy' && status !== 'Đã hủy') {
      return res.status(400).json({ message: 'Không thể thay đổi trạng thái đơn hàng đã hủy' });
    }
    if (oldOrder.status === 'Đã giao hàng' && status !== 'Đã giao hàng') {
      return res.status(400).json({ message: 'Không thể thay đổi trạng thái đơn hàng đã giao' });
    }

    // Cho phép hủy đơn ở bất kỳ trạng thái nào (trước khi giao hàng)
    if (status === 'Đã hủy') {
      const updateData = {
        status,
        cancelledDate: new Date() // Lưu thời gian hủy đơn
      };
      // Lưu lý do hủy nếu có
      if (req.body.cancelReason) {
        updateData.cancelReason = req.body.cancelReason;
      }
      const ord = await Order.findByIdAndUpdate(orderId, updateData, { new: true });
      return res.json({ message: 'Đã hủy đơn hàng thành công', order: ord });
    }

    // Kiểm tra trình tự trạng thái
    const oldIndex = STATUS_SEQUENCE.indexOf(oldOrder.status);
    const newIndex = STATUS_SEQUENCE.indexOf(status);

    // Nếu trạng thái cũ hoặc mới không nằm trong trình tự, cho phép (để tương thích với các trạng thái khác)
    if (oldIndex === -1 || newIndex === -1) {
      const ord = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
      return res.json({ message: 'Cập nhật trạng thái thành công', order: ord });
    }

    // Chỉ cho phép chuyển sang trạng thái tiếp theo hoặc giữ nguyên
    if (newIndex !== oldIndex && newIndex !== oldIndex + 1) {
      return res.status(400).json({
        message: `Không thể chuyển từ "${oldOrder.status}" sang "${status}". Chỉ có thể chuyển sang trạng thái tiếp theo trong trình tự.`
      });
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData = { status };

    // Cập nhật thời gian khi chuyển sang "Đang giao hàng"
    if (status === 'Đang giao hàng' && oldOrder.status !== 'Đang giao hàng') {
      updateData.shippingDate = new Date();
    }

    // Cập nhật thời gian khi chuyển sang "Đã giao hàng"
    if (status === 'Đã giao hàng' && oldOrder.status !== 'Đã giao hàng') {
      updateData.deliveredDate = new Date();
      // Nếu chưa có shippingDate, đặt luôn (trường hợp nhảy bước)
      if (!oldOrder.shippingDate) {
        updateData.shippingDate = new Date();
      }
    }

    const ord = await Order.findByIdAndUpdate(orderId, updateData, { new: true });

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

        // ✅ ƯU TIÊN dùng discount đã lưu trong order thay vì tính lại từ voucher
        if (ord.voucherCode && ord.discount) {
          // Dùng discount đã lưu
          const discountTotal = ord.discount;
          voucherInfo = { code: ord.voucherCode, discountApplied: discountTotal };

          // Phân bổ discount cho từng item theo tỉ lệ giá (nếu chưa có discountAmount)
          const hasItemDiscount = ord.items.some(item => item.discountAmount && item.discountAmount > 0);

          if (!hasItemDiscount) {
            const totalItemAmount = ord.items.reduce((sum, item) => sum + item.price * (item.qty || 1), 0);
            ord.items = ord.items.map(item => {
              const itemAmount = item.price * (item.qty || 1);
              const itemDiscount = totalItemAmount > 0 ? Math.round((itemAmount / totalItemAmount) * discountTotal) : 0;
              return { ...item, discount: itemDiscount, discountAmount: itemDiscount };
            });
          } else {
            // Đã có discountAmount → giữ nguyên
            ord.items = ord.items.map(item => ({ ...item }));
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

// POST /api/orders/zalopay/callback => Xử lý callback từ ZaloPay Sandbox
router.post('/zalopay/callback', async (req, res) => {
  try {
    const { appid, apptransid, pmcid, status, amount, description, timestamp, mac } = req.body;

    console.log('[ZaloPay Callback] Received:', {
      appid,
      apptransid,
      status,
      amount,
      timestamp: new Date(timestamp).toISOString()
    });

    // Tìm đơn hàng theo apptransid
    // apptransid format: ${Date.now()}_${orderId}
    const orderIdMatch = apptransid ? apptransid.split('_').pop() : null;

    if (!orderIdMatch) {
      console.error('[ZaloPay Callback] Cannot extract orderId from apptransid:', apptransid);
      return res.status(400).json({ message: 'Invalid apptransid' });
    }

    // Tìm đơn hàng theo ID hoặc code
    let order = null;
    try {
      // Thử tìm theo MongoDB _id (nếu orderIdMatch là ObjectId)
      if (mongoose.Types.ObjectId.isValid(orderIdMatch)) {
        order = await Order.findById(orderIdMatch);
      }

      // Nếu không tìm thấy, thử tìm theo code
      if (!order) {
        order = await Order.findOne({ code: orderIdMatch });
      }

      // Nếu vẫn không tìm thấy, tìm order ZaloPay gần nhất có trạng thái "Chờ thanh toán"
      // và kiểm tra xem apptransid có chứa orderId không
      if (!order) {
        const recentOrders = await Order.find({
          payment: 'zalopay',
          status: { $in: ['Chờ thanh toán', 'Chờ xác nhận'] }
        })
          .sort({ createdAt: -1 })
          .limit(20);

        // Tìm order có _id hoặc code khớp với orderIdMatch
        order = recentOrders.find(o => {
          const orderIdStr = String(o._id);
          const orderCodeStr = String(o.code || '');
          return orderIdStr.includes(orderIdMatch) ||
            orderCodeStr.includes(orderIdMatch) ||
            orderIdMatch.includes(orderIdStr.substring(orderIdStr.length - 8)) ||
            orderIdMatch.includes(orderCodeStr);
        });
      }

      // Nếu vẫn không tìm thấy, lấy order ZaloPay mới nhất (fallback)
      if (!order && apptransid) {
        const timestamp = apptransid.split('_')[0];
        const orderTime = new Date(parseInt(timestamp));
        const timeRange = {
          $gte: new Date(orderTime.getTime() - 5 * 60 * 1000), // 5 phút trước
          $lte: new Date(orderTime.getTime() + 5 * 60 * 1000)  // 5 phút sau
        };
        order = await Order.findOne({
          payment: 'zalopay',
          status: { $in: ['Chờ thanh toán', 'Chờ xác nhận'] },
          createdAt: timeRange
        }).sort({ createdAt: -1 });
      }
    } catch (err) {
      console.error('[ZaloPay Callback] Error finding order:', err);
    }

    if (!order) {
      console.error('[ZaloPay Callback] Order not found for apptransid:', apptransid);
      return res.status(404).json({ message: 'Order not found' });
    }

    // Cập nhật trạng thái đơn hàng
    if (status === 1) {
      // Thanh toán thành công
      order.status = 'Đã xác nhận';
      await order.save();
      console.log('[ZaloPay Callback] ✅ Order updated to "Đã xác nhận":', order._id);
    } else {
      // Thanh toán thất bại
      order.status = 'Chờ xác nhận';
      await order.save();
      console.log('[ZaloPay Callback] ❌ Payment failed, order status unchanged:', order._id);
    }

    // Trả về response cho ZaloPay
    res.json({
      return_code: status === 1 ? 1 : -1,
      return_message: status === 1 ? 'success' : 'failed',
      orderId: order._id,
      paymentSuccess: status === 1
    });
  } catch (e) {
    console.error('[ZaloPay Callback] Error:', e);
    res.status(500).json({
      return_code: 0,
      return_message: 'error',
      error: e.message
    });
  }
});

module.exports = router;
