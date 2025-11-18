# Giữ Dialog hiển thị khi khởi động lại App

## Vấn đề:

✅ Dialog hiển thị OK khi back về ngay sau thanh toán
❌ Dialog KHÔNG hiển thị khi tắt app và mở lại

## Nguyên nhân:

Trong `handlePaymentSuccess`, có đoạn code XÓA flag ngay:

```typescript
// Xóa flag để tránh hiển thị lại
await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
```

→ Flag bị xóa sau lần hiển thị đầu tiên
→ Khi mở lại app, không còn flag để kiểm tra

## Giải pháp: CHỈ xóa flag khi user đóng dialog

### Bước 1: Tìm hàm handlePaymentSuccess

Tìm trong checkout.tsx:

```typescript
const handlePaymentSuccess = React.useCallback(async () => {
    // ... code ...
    
    // ❌ TÌM VÀ XÓA DÒNG NÀY:
    await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
    
    // ... code ...
}, []);
```

### Bước 2: XÓA dòng removeItem trong handlePaymentSuccess

Chỉ cần **COMMENT hoặc XÓA** dòng đó:

```typescript
const handlePaymentSuccess = React.useCallback(async () => {
    console.log('🎉 handlePaymentSuccess called!');
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return;

      // Xóa sản phẩm đã thanh toán khỏi giỏ hàng
      try {
        const fullCartStr = await AsyncStorage.getItem(`cart_${user._id}`);
        let fullCart = fullCartStr ? JSON.parse(fullCartStr) : [];
        fullCart = Array.isArray(fullCart) ? fullCart : [];
        const remaining = fullCart.filter(i => !i?.checked);
        await AsyncStorage.setItem(`cart_${user._id}`, JSON.stringify(remaining));
      } catch { }

      // Xóa buy now nếu có
      try {
        await AsyncStorage.removeItem(`buy_now_${user._id}`);
      } catch { }

      // Reset cart và voucher
      setCart([]);
      setAppliedVoucher(null);
      setVoucherDiscount(0);
      setVoucherCode('');

      // Xóa pending flag
      try {
        await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
      } catch { }

      // ❌ XÓA DÒNG NÀY - Không xóa success flag ngay
      // await AsyncStorage.removeItem(`zalopay_success_${user._id}`);

      // Hiển thị dialog thành công
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('[Checkout] Error handling payment success:', error);
    }
}, []);
```

### Bước 3: Xóa flag KHI USER ĐÓNG DIALOG

Trong JSX dialog, các nút đã có code xóa flag rồi. Đảm bảo có đoạn này:

```typescript
{showSuccessDialog && (
  <View style={{ ... }}>
    <View style={{ ... }}>
      {/* ... icon, title, message ... */}
      
      <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
        {/* Button: Xem đơn hàng */}
        <TouchableOpacity
          style={{ ... }}
          onPress={async () => {
            setShowSuccessDialog(false);
            
            // ✅ XÓA FLAG KHI USER ĐÓNG DIALOG
            try {
              const userString = await AsyncStorage.getItem('user');
              const user = userString ? JSON.parse(userString) : null;
              if (user && user._id) {
                await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
                console.log('✅ Flag removed when user closed dialog');
              }
            } catch { }
            
            router.push('/orders');
          }}
        >
          <Text>Xem đơn hàng</Text>
        </TouchableOpacity>
        
        {/* Button: Về trang chủ */}
        <TouchableOpacity
          style={{ ... }}
          onPress={async () => {
            setShowSuccessDialog(false);
            
            // ✅ XÓA FLAG KHI USER ĐÓNG DIALOG
            try {
              const userString = await AsyncStorage.getItem('user');
              const user = userString ? JSON.parse(userString) : null;
              if (user && user._id) {
                await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
                console.log('✅ Flag removed when user closed dialog');
              }
            } catch { }
            
            router.replace('/(tabs)/home');
          }}
        >
          <Text>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
```

## Luồng hoạt động sau khi sửa:

### Kịch bản 1: User xem dialog ngay

1. Thanh toán thành công → Flag được set
2. Back về app → Dialog hiển thị
3. User nhấn "Xem đơn hàng" → Flag bị xóa
4. Tắt app, mở lại → Dialog KHÔNG hiển thị (đúng!)

### Kịch bản 2: User tắt app trước khi xem dialog

1. Thanh toán thành công → Flag được set
2. Back về app → Dialog hiển thị
3. User tắt app (không nhấn nút nào)
4. Mở lại app → Flag VẪN CÒN
5. Vào checkout → Dialog hiển thị lại! ✅
6. User nhấn nút → Flag bị xóa
7. Lần sau không hiển thị nữa

## Tùy chọn: Tự động xóa flag sau 24 giờ

Nếu muốn flag tự động hết hạn sau 24 giờ:

### Cập nhật cách lưu flag

Trong zalopay-sandbox.html hoặc khi set flag, lưu kèm timestamp:

```javascript
// Thay vì:
localStorage.setItem(`zalopay_success_${userId}`, 'true');

// Dùng:
const successData = {
  timestamp: Date.now(),
  orderId: orderId
};
localStorage.setItem(`zalopay_success_${userId}`, JSON.stringify(successData));
```

### Cập nhật checkPaymentSuccess

```typescript
const checkPaymentSuccess = React.useCallback(async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return false;

      const successFlag = await AsyncStorage.getItem(`zalopay_success_${user._id}`);
      if (successFlag) {
        try {
          // Thử parse JSON
          const successData = JSON.parse(successFlag);
          const timeSincePayment = Date.now() - successData.timestamp;
          
          // Chỉ hiển thị nếu trong vòng 24 giờ
          if (timeSincePayment < 24 * 60 * 60 * 1000) {
            console.log('[Checkout] ✅ Payment success flag found (valid)');
            await handlePaymentSuccess();
            return true;
          } else {
            // Xóa flag cũ (quá 24 giờ)
            console.log('[Checkout] ⏰ Flag expired, removing...');
            await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
            return false;
          }
        } catch (e) {
          // Flag không phải JSON, xử lý như cũ
          if (successFlag === 'true') {
            console.log('[Checkout] ✅ Payment success flag found (legacy)');
            await handlePaymentSuccess();
            return true;
          }
        }
      }
      
      // ... phần check backend giữ nguyên
    } catch (error) {
      console.error('[Checkout] Error checking payment success:', error);
      return false;
    }
}, [handlePaymentSuccess]);
```

## Tóm tắt:

**Giải pháp đơn giản (Khuyến nghị):**

1. ❌ XÓA dòng `removeItem` trong `handlePaymentSuccess`
2. ✅ GIỮ code xóa flag trong các nút dialog
3. ✅ Dialog sẽ hiển thị lại khi mở app (nếu chưa đóng)
4. ✅ Dialog không hiển thị lại sau khi user đã đóng

**Giải pháp nâng cao (Tùy chọn):**

- Lưu timestamp khi set flag
- Tự động xóa flag sau 24 giờ
- Tránh dialog hiển thị mãi mãi nếu user quên đóng

Chọn giải pháp nào phù hợp với UX của bạn!
