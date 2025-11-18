# Kiểm tra cuối cùng - ZaloPay Dialog

## ✅ Đã kiểm tra orderRoutes.js

File orderRoutes.js của bạn **ĐÃ TỐT**! Có callback route với logic tìm order rất chi tiết.

Tôi đã sửa nhỏ:
- `returncode` → `return_code`
- `returnmessage` → `return_message`
- Thêm `orderId` và `paymentSuccess` vào response

## Bước tiếp theo:

### 1. Restart Backend Server

```bash
# Dừng server hiện tại (Ctrl+C)
# Sau đó chạy lại:
cd backend
npm start
```

### 2. Kiểm tra Backend logs khi thanh toán

Khi bạn nhấn "Thanh toán thành công" trên sandbox, backend PHẢI có logs:

```
[ZaloPay Callback] Received: { appid: '2554', apptransid: '...', status: 1, ... }
[ZaloPay Callback] ✅ Order updated to "Đã xác nhận": 691a6f7471b6e9125d0c9532
```

### 3. Kiểm tra App logs

Sau khi back về app, PHẢI có logs:

```
[Checkout] Checking backend for payment success...
[Checkout] Payment success detected from backend order status
🎉 handlePaymentSuccess called!
🎉 Setting showSuccessDialog to true
```

### 4. Nếu vẫn không hoạt động

**Thêm test button vào checkout.tsx:**

```typescript
{/* TEST BUTTON - Thêm vào đầu ScrollView */}
<View style={{ padding: 10, backgroundColor: '#f0f0f0', margin: 10 }}>
  <TouchableOpacity
    style={{ backgroundColor: 'green', padding: 15, borderRadius: 5 }}
    onPress={() => {
      console.log('TEST: Showing dialog directly');
      setShowSuccessDialog(true);
    }}
  >
    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
      TEST: Show Success Dialog
    </Text>
  </TouchableOpacity>
</View>
```

Nếu button này hiển thị được dialog → Vấn đề ở logic kiểm tra
Nếu button này KHÔNG hiển thị dialog → Vấn đề ở JSX/Styles

### 5. Kiểm tra JSX Dialog có trong code không

Tìm trong checkout.tsx, PHẢI có đoạn này TRƯỚC `</SafeAreaView>`:

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

### 6. Kiểm tra Styles có đầy đủ không

Trong `StyleSheet.create`, PHẢI có:

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

## Checklist cuối cùng:

- [x] Backend có callback route `/api/orders/zalopay/callback`
- [x] Callback route có logic tìm order chi tiết
- [x] Response format đúng (`return_code`, `return_message`)
- [ ] Backend server đã restart
- [ ] Test thanh toán và xem backend logs
- [ ] Test button "Show Dialog" hoạt động
- [ ] JSX dialog có trong code
- [ ] Styles có đầy đủ

## Nếu tất cả đều OK nhưng vẫn không hiển thị:

Có thể do LDPlayer không sync localStorage. Thử giải pháp này:

**Thêm vào zalopay-sandbox.html sau khi callback thành công:**

```javascript
if (response.ok && result.return_code === 1) {
    // ... code hiện tại ...
    
    // ✅ THÊM: Tự động redirect về app sau 2 giây
    setTimeout(() => {
        // Tạo deep link với payment=success
        const appScheme = 'exp://192.168.1.9:8081';
        const deepLink = `${appScheme}/--/checkout?payment=success&orderId=${result.orderId}`;
        
        console.log('🔗 Redirecting to app:', deepLink);
        window.location.href = deepLink;
    }, 2000);
}
```

Điều này sẽ tự động redirect về app với params `payment=success`, và checkout.tsx đã có logic xử lý:

```typescript
useEffect(() => {
    if (params.payment === 'success') {
      console.log('Payment success detected from URL params');
      handlePaymentSuccess();
    }
}, [params.payment]);
```

Làm theo checklist trên là dialog sẽ hiển thị!
