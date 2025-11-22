# Hướng dẫn khôi phục hệ thống đánh giá từ đầu

## Nguyên tắc đơn giản:
1. Mỗi sản phẩm (productId + color + size) = 1 review
2. Sử dụng `itemIdentifier` = `productId_color_size`
3. Unique index: `{ orderId, userId, itemIdentifier }`
4. Không retry phức tạp, chỉ submit 1 lần

## Bước 1: Reset database (nếu cần)
```javascript
// Trong MongoDB shell hoặc Compass
db.reviews.deleteMany({})
db.reviews.dropIndexes()
```

## Bước 2: Backend - Model (backend/model/Review.js)
```javascript
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
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shoes', required: true, index: true },
  itemIdentifier: { type: String, required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  items: { type: [reviewItemSchema], default: [] },
}, { timestamps: true });

// Unique: một user chỉ review một item trong một order một lần
reviewSchema.index({ orderId: 1, userId: 1, itemIdentifier: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
```

## Bước 3: Backend - Route POST (backend/routes/reviewRoutes.js)
Thay thế route POST '/' bằng code đơn giản:

```javascript
router.post('/', async (req, res) => {
  try {
    const { orderId, userId, productId, rating, comment, items } = req.body;

    // Validation
    if (!orderId || !userId || !productId || !rating) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Tạo itemIdentifier
    let itemIdentifier;
    if (items && items.length > 0) {
      const item = items[0];
      const color = String(item.color || '').trim();
      const size = String(item.size || '').trim();
      itemIdentifier = `${productId}_${color}_${size}`;
    } else {
      itemIdentifier = String(productId);
    }

    // Kiểm tra đã tồn tại
    const existing = await Review.findOne({ orderId, userId, itemIdentifier });
    if (existing) {
      return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });
    }

    // Tạo review
    const review = new Review({
      orderId,
      userId,
      productId,
      itemIdentifier,
      rating: Number(rating),
      comment: comment || '',
      items: items || []
    });

    await review.save();

    // Populate
    await review.populate('userId', 'name phone');
    await review.populate('orderId', 'code _id');
    await review.populate('productId', 'name');

    res.status(201).json(review);
  } catch (e) {
    console.error('POST /api/reviews error:', e);
    if (e.code === 11000) {
      return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });
    }
    res.status(500).json({ message: 'Lỗi tạo đánh giá' });
  }
});
```

## Bước 4: Frontend - review/[id].tsx (đơn giản hóa)
Loại bỏ retry logic phức tạp, chỉ submit 1 lần:

```typescript
const handleSubmit = async () => {
  // ... validation code ...

  setLoading(true);
  const submittedCount = 0;
  const errors = [];

  for (const item of items) {
    const itemKey = `${item.productId || item._id}_${item.color}_${item.size}`;
    const productReview = productRatings[itemKey];
    
    if (!productReview || !productReview.rating) continue;

    try {
      const res = await fetch(`${BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: backendOrderId,
          userId: user._id,
          productId: item.productId || item._id,
          rating: productReview.rating,
          comment: productReview.comment || '',
          items: [item]
        })
      });

      if (res.ok) {
        submittedCount++;
      } else {
        const data = await res.json();
        if (!data.message?.includes('đã đánh giá')) {
          errors.push(item.name);
        }
      }
    } catch (e) {
      errors.push(item.name);
    }

    // Delay giữa các request
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  setLoading(false);

  if (submittedCount > 0) {
    Alert.alert('Thành công', `Đã đánh giá thành công ${submittedCount} sản phẩm!`);
    router.back();
  } else if (errors.length > 0) {
    Alert.alert('Lỗi', `Không thể đánh giá: ${errors.join(', ')}`);
  }
};
```

## Bước 5: Test
1. Restart backend
2. Tạo đơn hàng với 2 sản phẩm khác nhau
3. Đánh giá 2 sản phẩm
4. Kiểm tra:
   - Backend log: 2 reviews được tạo
   - Admin Reviews.jsx: Hiển thị 2 reviews
   - order/[id].tsx: Không cho phép đánh giá lại

## Lưu ý:
- Delay 500ms giữa các request để tránh race condition
- Không retry, chỉ submit 1 lần
- Nếu lỗi "đã đánh giá", bỏ qua (không đếm vào errors)
- itemIdentifier phải có productId (required trong model)
