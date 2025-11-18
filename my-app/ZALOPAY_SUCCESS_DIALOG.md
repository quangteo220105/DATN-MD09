# Thêm Dialog thông báo thanh toán ZaloPay thành công

## Mục tiêu:
Khi người dùng thanh toán ZaloPay thành công và quay lại app (bằng nút Back trên LDPlayer), checkout.tsx sẽ tự động hiển thị dialog thông báo đơn hàng đã được đặt.

## Giải pháp:

### Bước 1: Thêm state cho success dialog

Trong file `checkout.tsx`, thêm state mới (sau các state hiện có):

```typescript
const [showSuccessDialog, setShowSuccessDialog] = useState(false);
const [successOrderId, setSuccessOrderId] = useState('');
```

### Bước 2: Thêm useFocusEffect để kiểm tra thanh toán thành công

Import useFocusEffect nếu chưa có:

```typescript
import { useFocusEffect } from '@react-navigation/native';
```

Thêm useFocusEffect để kiểm tra khi quay lại màn hình:

```typescript
// Kiểm tra thanh toán ZaloPay thành công khi quay lại màn hình
useFocusEffect(
    React.useCallback(() => {
        const checkZaloPaySuccess = async () => {
            try {
                const userString = await AsyncStorage.getItem('user');
                const user = userString ? JSON.parse(userString) : null;
                if (!user || !user._id) return;

                // Kiểm tra flag thanh toán thành công
                const paymentSuccessFlag = await AsyncStorage.getItem(`zalopay_success_${user._id}`);
                
                if (paymentSuccessFlag) {
                    // Parse thông tin đơn hàng
                    const paymentInfo = JSON.parse(paymentSuccessFlag);
                    
                    // Hiển thị dialog thành công
                    setSuccessOrderId(paymentInfo.orderId || '');
                    setShowSuccessDialog(true);
                    
                    // Xóa flag để không hiển thị lại
                    await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
                    
                    // Xóa giỏ hàng đã thanh toán
                    try {
                        const fullCartStr = await AsyncStorage.getItem(`cart_${user._id}`);
                        let fullCart = fullCartStr ? JSON.parse(fullCartStr) : [];
                        fullCart = Array.isArray(fullCart) ? fullCart : [];
                        const remaining = fullCart.filter(i => !i?.checked);
                        await AsyncStorage.setItem(`cart_${user._id}`, JSON.stringify(remaining));
                    } catch { }
                    
                    // Reset voucher
                    setAppliedVoucher(null);
                    setVoucherDiscount(0);
                    setVoucherCode('');
                }
            } catch (error) {
                console.log('Error checking ZaloPay success:', error);
            }
        };

        checkZaloPaySuccess();
    }, [])
);
```

### Bước 3: Cập nhật hàm confirmOrder để lưu flag

Trong hàm `confirmOrder`, sau khi gọi `openZaloPay`, thêm code lưu flag:

```typescript
// Nếu là ZaloPay, mở trình duyệt thanh toán
if (payment === 'zalopay') {
    // Sử dụng backendOrderId nếu có, nếu không dùng orderId local
    const paymentOrderId = backendOrderId || orderId;
    const orderDescription = `Thanh toan don hang ${paymentOrderId}`;
    
    // Lưu thông tin đơn hàng để kiểm tra sau
    await AsyncStorage.setItem(`pending_zalopay_order_${user._id}`, JSON.stringify({
        orderId: paymentOrderId,
        items: cart,
        total: finalTotal,
        discount: voucherDiscount,
        voucherCode: appliedVoucher?.code,
        timestamp: Date.now()
    }));
    
    await openZaloPay(paymentOrderId, finalTotal, orderDescription);
    
    // KHÔNG hiển thị Alert ở đây nữa, để dialog tự động hiển thị khi quay lại
    // Chỉ navigate về home
    router.replace('/(tabs)/home');
} else {
    // ... code COD giữ nguyên
}
```

### Bước 4: Cập nhật backend callback để set flag

Trong file `backend/routes/orderRoutes.js`, tìm route `/zalopay/callback` và cập nhật:

```javascript
router.post('/zalopay/callback', async (req, res) => {
    try {
        const { appid, apptransid, status, amount } = req.body;
        
        console.log('ZaloPay callback received:', req.body);
        
        if (status === 1) { // Thanh toán thành công
            // Tìm orderId từ apptransid (format: timestamp_orderId)
            const parts = apptransid.split('_');
            const orderId = parts.length > 1 ? parts[1] : null;
            
            if (orderId) {
                // Cập nhật trạng thái đơn hàng
                const order = await Order.findById(orderId);
                if (order) {
                    order.status = 'Đã xác nhận';
                    order.paymentStatus = 'paid';
                    order.paidAt = new Date();
                    await order.save();
                    
                    console.log('✅ Order updated successfully:', orderId);
                    
                    // ✅ THÊM: Lưu flag thành công vào response để frontend biết
                    // (Frontend sẽ lưu vào AsyncStorage)
                    return res.json({ 
                        return_code: 1, 
                        return_message: 'success',
                        orderId: orderId,
                        paymentSuccess: true 
                    });
                }
            }
        }
        
        res.json({ return_code: 1, return_message: 'success' });
    } catch (error) {
        console.error('ZaloPay callback error:', error);
        res.json({ return_code: 0, return_message: 'error' });
    }
});
```

### Bước 5: Cập nhật zalopay-sandbox.html để lưu flag

Trong file `backend/public/zalopay-sandbox.html`, cập nhật phần xử lý success:

Tìm đoạn code sau khi callback thành công và THÊM:

```javascript
if (response.ok) {
    const result = await response.json();
    
    // ✅ THÊM: Lưu flag thành công vào localStorage
    // (Sẽ được đọc bởi app khi quay lại)
    if (result.paymentSuccess && result.orderId) {
        try {
            // Parse embeddata để lấy userId
            const embeddataObj = JSON.parse(embeddata);
            const userId = appuser; // hoặc lấy từ embeddata nếu có
            
            // Lưu flag vào localStorage (sẽ được sync với AsyncStorage)
            const successData = {
                orderId: result.orderId,
                timestamp: Date.now(),
                amount: amountNum
            };
            
            localStorage.setItem(`zalopay_success_${userId}`, JSON.stringify(successData));
            console.log('✅ Saved success flag to localStorage');
        } catch (e) {
            console.error('Failed to save success flag:', e);
        }
    }
    
    // ... phần code hiển thị thông báo giữ nguyên
}
```

### Bước 6: Thêm Success Dialog vào JSX

Trong file `checkout.tsx`, thêm dialog trước tag đóng `</SafeAreaView>`:

```typescript
{/* Success Dialog */}
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
            {successOrderId && (
                <Text style={styles.successOrderId}>
                    Mã đơn hàng: {successOrderId.substring(0, 8)}...
                </Text>
            )}
            <View style={styles.successActions}>
                <TouchableOpacity
                    style={[styles.successBtn, styles.successBtnSecondary]}
                    onPress={() => {
                        setShowSuccessDialog(false);
                        router.push('/orders');
                    }}
                >
                    <Text style={styles.successBtnTextSecondary}>Xem đơn hàng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.successBtn, styles.successBtnPrimary]}
                    onPress={() => {
                        setShowSuccessDialog(false);
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

### Bước 7: Thêm styles cho Success Dialog

Thêm vào StyleSheet.create:

```typescript
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
    marginBottom: 16,
},
successOrderId: {
    fontSize: 13,
    color: '#999',
    marginBottom: 24,
    fontFamily: 'monospace',
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

## Luồng hoạt động:

1. User chọn ZaloPay và nhấn "Xác nhận và thanh toán"
2. App lưu thông tin đơn hàng tạm vào AsyncStorage
3. App mở trình duyệt với zalopay-sandbox.html
4. User nhấn "Thanh toán thành công" trên sandbox
5. Sandbox gửi callback về server và lưu flag vào localStorage
6. User nhấn Back trên LDPlayer để quay lại app
7. App tự động chuyển về Home
8. User mở lại Checkout (hoặc app tự động mở)
9. useFocusEffect phát hiện flag thành công
10. ✅ Dialog thông báo tự động hiển thị!

## Lưu ý:

- Dialog chỉ hiển thị 1 lần (flag bị xóa sau khi đọc)
- Giỏ hàng tự động được xóa
- Voucher tự động được reset
- User có thể chọn "Xem đơn hàng" hoặc "Về trang chủ"
