# Hướng dẫn đầy đủ thêm Success Dialog vào Checkout.tsx

## Bước 1: Thêm state

Tìm dòng khai báo các state (sau `const [loadingVouchers, setLoadingVouchers] = useState(false);`) và THÊM:

```typescript
const [showSuccessDialog, setShowSuccessDialog] = useState(false);
const [successOrderId, setSuccessOrderId] = useState('');
```

## Bước 2: Thêm hàm handlePaymentSuccess

Tìm vị trí sau các state declarations và THÊM hàm này:

```typescript
// 🟢 Hàm xử lý thanh toán thành công
const handlePaymentSuccess = React.useCallback(async () => {
    console.log('🎉 handlePaymentSuccess called!');
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return;

      console.log('🎉 User found:', user._id);

      // Xóa sản phẩm đã thanh toán khỏi giỏ hàng
      try {
        const fullCartStr = await AsyncStorage.getItem(`cart_${user._id}`);
        let fullCart = fullCartStr ? JSON.parse(fullCartStr) : [];
        fullCart = Array.isArray(fullCart) ? fullCart : [];
        const remaining = fullCart.filter(i => !i?.checked);
        await AsyncStorage.setItem(`cart_${user._id}`, JSON.stringify(remaining));
        console.log('🎉 Cart cleared');
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
      console.log('🎉 States reset');

      // Xóa pending flag
      try {
        await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
      } catch { }

      // Hiển thị dialog thành công
      console.log('🎉 Setting showSuccessDialog to true');
      setShowSuccessDialog(true);
      console.log('🎉 Dialog should show now!');
    } catch (error) {
      console.error('[Checkout] Error handling payment success:', error);
    }
}, []);
```

## Bước 3: Thêm hàm checkPaymentSuccess

Sau hàm `handlePaymentSuccess`, THÊM:

```typescript
// 🟢 Hàm kiểm tra thanh toán thành công
const checkPaymentSuccess = React.useCallback(async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) return false;

      console.log('[Checkout] Checking payment success for user:', user._id);

      // Kiểm tra flag thanh toán thành công
      const successFlag = await AsyncStorage.getItem(`zalopay_success_${user._id}`);
      if (successFlag === 'true') {
        console.log('[Checkout] ✅ Payment success flag found!');
        await handlePaymentSuccess();
        return true;
      }

      // Kiểm tra đơn hàng ZaloPay mới nhất từ backend (fallback)
      const pendingFlag = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
      if (pendingFlag) {
        const pendingData = JSON.parse(pendingFlag);
        const timeSincePayment = Date.now() - pendingData.timestamp;
        
        // Chỉ kiểm tra nếu thanh toán trong vòng 10 phút
        if (timeSincePayment < 10 * 60 * 1000) {
          try {
            console.log('[Checkout] Checking backend for payment success...');

            const response = await fetch(`${BASE_URL}/orders/user/${user._id}/list`);
            if (response.ok) {
              const json = await response.json();
              const orders = Array.isArray(json) ? json : json.data || [];
              
              // Tìm đơn hàng ZaloPay có trạng thái "Đã xác nhận"
              const zalopayOrder = orders.find((o: any) => {
                if (o.payment !== 'zalopay') return false;
                const status = (o.status || '').toLowerCase().trim();
                return status === 'đã xác nhận' || 
                       status.includes('xác nhận') || 
                       status === 'confirmed';
              });

              if (zalopayOrder) {
                const orderTime = zalopayOrder.createdAt ? new Date(zalopayOrder.createdAt).getTime() : 0;
                const timeDiff = Date.now() - orderTime;
                
                // Nếu đơn hàng được tạo trong vòng 10 phút gần đây
                if (timeDiff < 10 * 60 * 1000) {
                  console.log('[Checkout] ✅ Payment success detected from backend!');
                  await AsyncStorage.setItem(`zalopay_success_${user._id}`, 'true');
                  await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
                  await handlePaymentSuccess();
                  return true;
                }
              }
            }
          } catch (error) {
            console.error('[Checkout] Error checking backend order:', error);
          }
        }
      }
      return false;
    } catch (error) {
      console.error('[Checkout] Error checking payment success:', error);
      return false;
    }
}, [handlePaymentSuccess]);
```

## Bước 4: Thêm useFocusEffect để kiểm tra khi màn hình được focus

Tìm các `useFocusEffect` hiện có và THÊM một cái mới:

```typescript
// 🟢 Kiểm tra thanh toán thành công khi màn hình được focus
useFocusEffect(
    React.useCallback(() => {
      console.log('[Checkout] Screen focused, checking payment success...');
      
      // Kiểm tra ngay
      checkPaymentSuccess();

      // Kiểm tra lại sau các khoảng thời gian
      const timeouts = [
        setTimeout(() => checkPaymentSuccess(), 1000),
        setTimeout(() => checkPaymentSuccess(), 2000),
        setTimeout(() => checkPaymentSuccess(), 5000)
      ];

      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }, [checkPaymentSuccess])
);
```

## Bước 5: Thêm Success Dialog vào JSX

Tìm dòng `</SafeAreaView>` (dòng cuối cùng trước khi đóng component) và THÊM dialog TRƯỚC nó:

```typescript
      {/* Fixed button */}
      <View style={styles.fixedBtnWrap}>
        <TouchableOpacity style={styles.confirmBtn} disabled={cart.length === 0} onPress={confirmOrder}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>Xác nhận và thanh toán</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ THÊM SUCCESS DIALOG VÀO ĐÂY */}
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
                  
                  // Xóa flag khi user đóng dialog
                  try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                      await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
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
                  
                  // Xóa flag khi user đóng dialog
                  try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                      await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
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
    </SafeAreaView>
  );
}
```

## Bước 6: Thêm styles

Tìm `const styles = StyleSheet.create({` và THÊM các styles sau (ở cuối, trước dấu `});`):

```typescript
  // ✅ THÊM STYLES CHO SUCCESS DIALOG
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  successDialog: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 24,
    maxWidth: 360,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  successBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBtnPrimary: {
    backgroundColor: '#ff4757',
  },
  successBtnSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  successBtnTextPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  successBtnTextSecondary: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
```

## Bước 7: Cập nhật confirmOrder để lưu pending flag

Tìm hàm `confirmOrder`, trong phần xử lý ZaloPay, THÊM:

```typescript
// Nếu là ZaloPay, mở trình duyệt thanh toán
if (payment === 'zalopay') {
  // ✅ THÊM: Lưu pending flag
  try {
    await AsyncStorage.setItem(`zalopay_pending_${user._id}`, JSON.stringify({
      orderId: backendOrderId || orderId,
      timestamp: Date.now()
    }));
  } catch { }

  // Sử dụng backendOrderId nếu có, nếu không dùng orderId local
  const paymentOrderId = backendOrderId || orderId;
  const orderDescription = `Thanh toan don hang ${paymentOrderId}`;
  await openZaloPay(paymentOrderId, finalTotal, orderDescription);

  // ... phần Alert giữ nguyên
}
```

## Tóm tắt các vị trí cần sửa:

1. **Sau khai báo state** → Thêm `showSuccessDialog` và `successOrderId`
2. **Sau state declarations** → Thêm `handlePaymentSuccess` và `checkPaymentSuccess`
3. **Sau các useFocusEffect** → Thêm useFocusEffect mới để check payment
4. **Trước `</SafeAreaView>`** → Thêm JSX dialog
5. **Trong StyleSheet.create** → Thêm styles cho dialog
6. **Trong hàm confirmOrder** → Thêm lưu pending flag

## Test:

1. Thanh toán ZaloPay
2. Nhấn "Thanh toán thành công"
3. Back về app
4. ✅ Dialog hiển thị
5. Tắt app, mở lại
6. Vào checkout
7. ✅ Dialog hiển thị lại (vì chưa đóng)
8. Nhấn "Xem đơn hàng" hoặc "Về trang chủ"
9. Flag bị xóa
10. Mở lại app → Dialog không hiển thị nữa (đúng!)

Làm theo 7 bước trên là xong!
