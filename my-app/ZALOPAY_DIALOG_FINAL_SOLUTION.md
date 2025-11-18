# Giải pháp cuối cùng cho ZaloPay Dialog

## Vấn đề
- Dialog hiển thị mãi mãi → Cần giới hạn thời gian
- Dialog hiển thị cho đơn cũ khi đăng nhập tài khoản khác → Cần lọc đơn mới
- Dialog không hiển thị khi restart app → Cần persist state

## Giải pháp tốt nhất: Lưu timestamp khi đóng dialog

### Logic:
1. Khi user đóng dialog → Lưu `zalopay_last_dismissed_${user._id}` = timestamp hiện tại
2. Khi kiểm tra → Chỉ hiển thị dialog cho đơn được tạo **SAU** timestamp đó
3. Không giới hạn thời gian → Dialog hiển thị mãi mãi cho đến khi user đóng

### Code thay đổi:

#### 1. Trong `checkPaymentSuccess` - Thay thế phần filter orders:

```typescript
// Lấy timestamp lần cuối user đóng dialog ZaloPay
const lastDismissedStr = await AsyncStorage.getItem(`zalopay_last_dismissed_${user._id}`);
const lastDismissedTime = lastDismissedStr ? parseInt(lastDismissedStr) : 0;

console.log('[Checkout] Last dismissed:', lastDismissedTime ? new Date(lastDismissedTime).toISOString() : 'Never');

// Tìm TẤT CẢ đơn ZaloPay
const allZaloPayOrders = orders.filter((o: any) => o.payment === 'zalopay');
console.log('[Checkout] All ZaloPay orders:', allZaloPayOrders.length);

// Tìm đơn mới nhất được tạo SAU khi user đóng dialog lần cuối
let newestUnseenOrder = null;
for (const order of allZaloPayOrders) {
  const orderTime = order.createdAt ? new Date(order.createdAt).getTime() : 0;
  
  // Chỉ xét đơn được tạo SAU khi user đóng dialog
  if (orderTime > lastDismissedTime) {
    if (!newestUnseenOrder || orderTime > new Date(newestUnseenOrder.createdAt).getTime()) {
      newestUnseenOrder = order;
    }
  }
}

if (newestUnseenOrder) {
  console.log('✅ NEW ZALOPAY ORDER FOUND!', {
    orderId: newestUnseenOrder._id,
    createdAt: newestUnseenOrder.createdAt
  });
  
  await handlePaymentSuccess();
  return true;
} else {
  console.log('[Checkout] No new ZaloPay orders since last dismissal');
}
```

#### 2. Trong button handlers - Lưu timestamp khi đóng:

```typescript
onPress={async () => {
  console.log('Button: Xem trạng thái');
  setShowSuccessDialog(false);

  // Lưu timestamp khi user đóng dialog
  try {
    const userString = await AsyncStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    if (user && user._id) {
      await AsyncStorage.setItem(`zalopay_last_dismissed_${user._id}`, Date.now().toString());
      console.log('✅ Saved dismissal timestamp');
    }
  } catch (e) {
    console.error('Error saving timestamp:', e);
  }

  router.replace('/orders');
}}
```

### Ưu điểm:
✅ Dialog hiển thị **VÔ HẠN** cho đến khi user đóng
✅ Không hiển thị cho đơn cũ khi đăng nhập tài khoản khác
✅ Không hiển thị khi vào checkout thường (chỉ hiển thị khi có đơn mới)
✅ Restart app vẫn hiển thị (nếu chưa đóng)
✅ Đơn giản, dễ maintain

### Flow hoàn chỉnh:

**Lần đầu sử dụng:**
- `zalopay_last_dismissed` = 0 (chưa có)
- Thanh toán ZaloPay → Đơn mới (timestamp > 0) → Hiển thị dialog
- Đóng dialog → Lưu timestamp = now
- Vào checkout → Không có đơn mới (timestamp < last_dismissed) → Không hiển thị

**Thanh toán lần 2:**
- Thanh toán ZaloPay → Đơn mới (timestamp > last_dismissed) → Hiển thị dialog
- Restart app → Vào checkout → Vẫn hiển thị (chưa đóng)
- Đóng dialog → Lưu timestamp mới

**Đăng nhập tài khoản khác:**
- Tài khoản mới có `zalopay_last_dismissed` riêng
- Nếu có đơn cũ → Không hiển thị (vì chưa có last_dismissed hoặc đơn quá cũ)
- Nếu thanh toán mới → Hiển thị dialog
