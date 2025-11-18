# Debug Checkout Dialog không hiển thị

## Bước 1: Kiểm tra Console Logs

Khi bạn thanh toán thành công và back về, hãy xem console có các log sau không:

### Logs cần tìm:

```
[Checkout] Component mounted, checking payment success...
[Checkout] Screen focused, checking payment success...
[Checkout] App became active, checking payment success...
Payment success detected from AsyncStorage flag
🎉 handlePaymentSuccess called!
🎉 Setting showSuccessDialog to true
```

### Nếu KHÔNG thấy logs:

**Vấn đề:** Logic kiểm tra không chạy hoặc flag không được set.

**Giải pháp:**

1. **Kiểm tra zalopay-sandbox.html có lưu flag không:**

Trong file `backend/public/zalopay-sandbox.html`, tìm phần xử lý success và THÊM:

```javascript
if (response.ok) {
    const result = await response.json();
    
    // ✅ THÊM: Lưu flag thành công
    try {
        // Lấy userId từ appuser
        const userId = appuser;
        
        // Lưu flag vào localStorage
        const successData = {
            orderId: result.orderId || apptransid,
            timestamp: Date.now(),
            amount: amountNum
        };
        
        localStorage.setItem(`zalopay_success_${userId}`, 'true');
        console.log('✅ Saved success flag to localStorage:', `zalopay_success_${userId}`);
        console.log('✅ Success data:', successData);
    } catch (e) {
        console.error('❌ Failed to save success flag:', e);
    }
    
    // ... phần code hiển thị thông báo
}
```

2. **Kiểm tra AsyncStorage có nhận được flag không:**

Thêm button test vào checkout.tsx (tạm thời):

```typescript
{/* TEST BUTTON - Thêm vào đầu ScrollView */}
<View style={{ padding: 10, backgroundColor: '#f0f0f0' }}>
  <TouchableOpacity
    style={{ backgroundColor: 'blue', padding: 10, borderRadius: 5 }}
    onPress={async () => {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (user && user._id) {
        // Kiểm tra flag hiện tại
        const flag = await AsyncStorage.getItem(`zalopay_success_${user._id}`);
        console.log('Current flag:', flag);
        
        // Set flag thủ công
        await AsyncStorage.setItem(`zalopay_success_${user._id}`, 'true');
        console.log('✅ Manually set flag');
        
        // Trigger check
        checkPaymentSuccess();
      }
    }}
  >
    <Text style={{ color: 'white', textAlign: 'center' }}>
      TEST: Check & Set Flag
    </Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={{ backgroundColor: 'green', padding: 10, borderRadius: 5, marginTop: 5 }}
    onPress={() => {
      console.log('Current showSuccessDialog:', showSuccessDialog);
      setShowSuccessDialog(true);
      console.log('Set showSuccessDialog to true');
    }}
  >
    <Text style={{ color: 'white', textAlign: 'center' }}>
      TEST: Show Dialog Directly
    </Text>
  </TouchableOpacity>
</View>
```

### Nếu THẤY logs nhưng dialog không hiển thị:

**Vấn đề:** JSX dialog bị thiếu hoặc styles không đúng.

**Giải pháp:**

1. **Kiểm tra JSX có dialog không:**

Tìm trong file checkout.tsx, PHẢI có đoạn này TRƯỚC `</SafeAreaView>`:

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

2. **Kiểm tra styles có đầy đủ không:**

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
// ... các styles khác
```

## Bước 2: Giải pháp đơn giản hơn (Nếu vẫn không hoạt động)

Thay vì dùng localStorage/AsyncStorage phức tạp, dùng URL params:

### Cập nhật zalopay-sandbox.html:

```javascript
// Sau khi callback thành công
if (response.ok) {
    // ... code hiện tại ...
    
    // Đợi 1.5 giây rồi redirect về app với params
    setTimeout(() => {
        // Tạo deep link với payment=success
        const appUrl = 'exp://192.168.1.x:8081/--/checkout?payment=success';
        window.location.href = appUrl;
    }, 1500);
}
```

### Checkout.tsx đã có sẵn logic xử lý params:

```typescript
useEffect(() => {
    // Kiểm tra params từ URL (Expo Router)
    if (params.payment === 'success') {
      console.log('Payment success detected from URL params');
      handlePaymentSuccess();
    }
    // ...
}, [params.payment]);
```

## Bước 3: Kiểm tra LDPlayer có vấn đề không

LDPlayer có thể không sync localStorage giữa browser và app. Thử:

1. **Dùng Alert thay vì Dialog để test:**

```typescript
const handlePaymentSuccess = React.useCallback(async () => {
    console.log('🎉 handlePaymentSuccess called!');
    
    // Test bằng Alert trước
    Alert.alert('TEST', 'handlePaymentSuccess được gọi!');
    
    try {
      // ... code hiện tại ...
      
      // Hiển thị dialog
      setShowSuccessDialog(true);
      
      // Test thêm Alert
      Alert.alert('SUCCESS', 'Dialog should show now!');
    } catch (error) {
      console.error('[Checkout] Error:', error);
      Alert.alert('ERROR', error.message);
    }
}, []);
```

2. **Kiểm tra app có focus không:**

Thêm log vào useFocusEffect:

```typescript
useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 [Checkout] Screen FOCUSED!');
      Alert.alert('DEBUG', 'Checkout screen focused');
      
      checkPaymentSuccess();
      // ...
    }, [checkPaymentSuccess])
);
```

## Bước 4: Giải pháp cuối cùng - Polling

Nếu tất cả đều không hoạt động, dùng polling để check backend:

```typescript
// Thêm vào useEffect
useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const startPolling = async () => {
        const userString = await AsyncStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        if (!user || !user._id) return;
        
        const pendingFlag = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
        if (pendingFlag) {
            console.log('🔄 Start polling for payment success...');
            
            // Poll mỗi 2 giây
            intervalId = setInterval(async () => {
                console.log('🔄 Polling...');
                const success = await checkPaymentSuccess();
                if (success) {
                    console.log('✅ Payment success detected, stop polling');
                    clearInterval(intervalId);
                }
            }, 2000);
            
            // Dừng sau 2 phút
            setTimeout(() => {
                console.log('⏱️ Polling timeout');
                clearInterval(intervalId);
            }, 120000);
        }
    };
    
    startPolling();
    
    return () => {
        if (intervalId) clearInterval(intervalId);
    };
}, [checkPaymentSuccess]);
```

## Checklist Debug:

- [ ] Console có log "handlePaymentSuccess called" không?
- [ ] Console có log "Setting showSuccessDialog to true" không?
- [ ] Test button "Show Dialog Directly" có hiển thị dialog không?
- [ ] JSX dialog có trong code không?
- [ ] Styles có đầy đủ không?
- [ ] zalopay-sandbox.html có lưu flag không?
- [ ] AsyncStorage có nhận được flag không?
- [ ] useFocusEffect có chạy không?

Làm theo các bước trên để tìm ra vấn đề chính xác!
