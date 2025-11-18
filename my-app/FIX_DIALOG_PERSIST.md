# Sửa Dialog không hiển thị khi khởi động lại app

## Vấn đề:

Dialog hiển thị OK khi back về ngay sau thanh toán, nhưng khi:
1. Tắt app
2. Mở lại app
3. Vào checkout

→ Dialog KHÔNG hiển thị nữa vì flag đã bị xóa.

## Nguyên nhân:

Trong `handlePaymentSuccess`, có đoạn:

```typescript
// Xóa flag để tránh hiển thị lại
await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
```

Flag bị xóa ngay sau lần hiển thị đầu tiên, nên khi mở lại app không còn flag để kiểm tra.

## Giải pháp 1: Chỉ xóa flag khi user đóng dialog (Khuyến nghị)

### Cập nhật handlePaymentSuccess

Trong file `checkout.tsx`, tìm hàm `handlePaymentSuccess` và SỬA:

```typescript
const handlePaymentSuccess = React.useCallback(async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return;

      // Kiểm tra xem đã xử lý chưa (tránh xử lý nhiều lần)
      const processedFlag = await AsyncStorage.getItem(`zalopay_processed_${user._id}`);
      if (processedFlag === 'true') {
        console.log('[Checkout] Payment success already processed, skipping...');
        return;
      }

      // Đánh dấu đã xử lý
      try {
        await AsyncStorage.setItem(`zalopay_processed_${user._id}`, 'true');
      } catch { }

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

      // ❌ XÓA DÒNG NÀY - Không xóa flag ngay
      // await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
      
      // ✅ THÊM: Chỉ xóa pending flag
      try {
        await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
      } catch { }

      // Hiển thị dialog thành công
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('[Checkout] Error handling payment success:', error);
    }
}, []);
```

### Cập nhật các nút trong Dialog để xóa flag

Tìm phần JSX dialog và SỬA các nút:

```typescript
{showSuccessDialog && (
  <View style={styles.dialogOverlay}>
    <View style={styles.successDialog}>
      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>✓</Text>
      </View>
      <Text style={styles.successTitle}>Đặt hàng thành công!</Text>
      <Text style={styles.successMessage}>
        Đơn hàng của bạn đã được đặt thành công và đang chờ xác nhận.
      </Text>
      <View style={styles.successActions}>
        <TouchableOpacity
          style={[styles.successBtn, styles.successBtnSecondary]}
          onPress={async () => {
            setShowSuccessDialog(false);
            
            // ✅ THÊM: Xóa flag khi user đóng dialog
            try {
              const userString = await AsyncStorage.getItem('user');
              const user = userString ? JSON.parse(userString) : null;
              if (user && user._id) {
                await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
                await AsyncStorage.removeItem(`zalopay_processed_${user._id}`);
              }
            } catch { }
            
            router.push('/orders');
          }}
        >
          <Text style={styles.successBtnTextSecondary}>Xem đơn hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.successBtn, styles.successBtnPrimary]}
          onPress={async () => {
            setShowSuccessDialog(false);
            
            // ✅ THÊM: Xóa flag khi user đóng dialog
            try {
              const userString = await AsyncStorage.getItem('user');
              const user = userString ? JSON.parse(userString) : null;
              if (user && user._id) {
                await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
                await AsyncStorage.removeItem(`zalopay_processed_${user._id}`);
              }
            } catch { }
            
            router.replace('/(tabs)/home');
          }}
        >
          <Text style={styles.successBtnTextPrimary}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
```

## Giải pháp 2: Dùng timestamp để kiểm tra (Nếu muốn tự động hết hạn)

### Thay đổi cách lưu flag

Thay vì lưu `'true'`, lưu timestamp:

```typescript
// Trong zalopay-sandbox.html hoặc khi set flag
const successData = {
  timestamp: Date.now(),
  orderId: orderId,
  shown: false // Chưa hiển thị
};
await AsyncStorage.setItem(`zalopay_success_${user._id}`, JSON.stringify(successData));
```

### Cập nhật checkPaymentSuccess

```typescript
const checkPaymentSuccess = React.useCallback(async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return false;

      // Kiểm tra flag thanh toán thành công
      const successFlag = await AsyncStorage.getItem(`zalopay_success_${user._id}`);
      if (successFlag) {
        try {
          const successData = JSON.parse(successFlag);
          const timeSincePayment = Date.now() - successData.timestamp;
          
          // Chỉ hiển thị nếu trong vòng 24 giờ và chưa hiển thị
          if (timeSincePayment < 24 * 60 * 60 * 1000 && !successData.shown) {
            console.log('[Checkout] Payment success detected from AsyncStorage flag');
            
            // Đánh dấu đã hiển thị
            successData.shown = true;
            await AsyncStorage.setItem(`zalopay_success_${user._id}`, JSON.stringify(successData));
            
            await handlePaymentSuccess();
            return true;
          } else if (timeSincePayment >= 24 * 60 * 60 * 1000) {
            // Xóa flag cũ (quá 24 giờ)
            await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
          }
        } catch (e) {
          // Flag không phải JSON, xử lý như cũ
          if (successFlag === 'true') {
            await handlePaymentSuccess();
            return true;
          }
        }
      }
      
      // ... phần check backend giữ nguyên
    } catch (error) {
      console.error('[Checkout] Error checking payment success flag:', error);
      return false;
    }
}, [handlePaymentSuccess]);
```

## Giải pháp 3: Hiển thị trong Orders.tsx thay vì Checkout (Đơn giản nhất)

Thay vì hiển thị dialog trong checkout, hiển thị trong màn Orders:

### Thêm vào orders.tsx

```typescript
// Thêm state
const [showPaymentSuccessDialog, setShowPaymentSuccessDialog] = useState(false);

// Thêm useEffect kiểm tra
useEffect(() => {
    const checkPaymentSuccess = async () => {
        try {
            const userString = await AsyncStorage.getItem('user');
            const user = userString ? JSON.parse(userString) : null;
            if (!user || !user._id) return;

            const successFlag = await AsyncStorage.getItem(`zalopay_success_${user._id}`);
            if (successFlag === 'true') {
                setShowPaymentSuccessDialog(true);
                await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
            }
        } catch (error) {
            console.error('Error checking payment success:', error);
        }
    };

    checkPaymentSuccess();
}, []);

// Thêm dialog vào JSX
{showPaymentSuccessDialog && (
    <View style={styles.dialogOverlay}>
        <View style={styles.successDialog}>
            <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Thanh toán thành công!</Text>
            <Text style={styles.successMessage}>
                Đơn hàng của bạn đã được thanh toán thành công qua ZaloPay.
            </Text>
            <TouchableOpacity
                style={styles.successBtn}
                onPress={() => setShowPaymentSuccessDialog(false)}
            >
                <Text style={styles.successBtnText}>Đóng</Text>
            </TouchableOpacity>
        </View>
    </View>
)}
```

## Khuyến nghị:

**Dùng Giải pháp 1** - Chỉ xóa flag khi user đóng dialog:
- ✅ Dialog hiển thị lại khi mở app (nếu chưa đóng)
- ✅ Không hiển thị lại sau khi user đã xem
- ✅ Đơn giản, dễ hiểu
- ✅ UX tốt nhất

**Hoặc Giải pháp 3** - Hiển thị trong Orders:
- ✅ Đơn giản nhất
- ✅ User thường vào Orders sau thanh toán
- ✅ Không cần logic phức tạp

Chọn giải pháp nào phù hợp với flow app của bạn!
