# SỬA DIALOG DÙNG INLINE STYLES - GIẢI PHÁP CUỐI CÙNG

## Vấn đề phát hiện:

Bạn đã thêm JSX:
```typescript
{showSuccessDialog && (
  <View style={styles.dialogOverlay}>  ← styles.dialogOverlay = undefined!
    <View style={styles.successDialog}>  ← styles.successDialog = undefined!
```

Nhưng file checkout.tsx **KHÔNG CÓ StyleSheet.create**, nên tất cả `styles.xxx` đều **undefined**.

→ Dialog không hiển thị vì không có styles!

## Giải pháp: Dùng INLINE STYLES

### Bước 1: XÓA dialog cũ

Tìm và XÓA đoạn code dialog bạn vừa thêm:

```typescript
{showSuccessDialog && (
  <View style={styles.dialogOverlay}>
    ...
  </View>
)}
```

### Bước 2: THÊM dialog mới với inline styles

THÊM đoạn code này TRƯỚC `</SafeAreaView>`:

```typescript
      {/* Success Dialog với INLINE STYLES */}
      {showSuccessDialog && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <View style={{
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
          }}>
            {/* Icon */}
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#22c55e',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <Text style={{
                fontSize: 48,
                color: '#fff',
                fontWeight: 'bold',
              }}>✓</Text>
            </View>
            
            {/* Title */}
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#1a1a1a',
              marginBottom: 12,
              textAlign: 'center',
            }}>Đặt hàng thành công!</Text>
            
            {/* Message */}
            <Text style={{
              fontSize: 15,
              color: '#666',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 24,
            }}>
              Đơn hàng của bạn đã được đặt thành công và đang chờ xác nhận.
            </Text>
            
            {/* Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
              width: '100%',
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  borderWidth: 1,
                  borderColor: '#e0e0e0',
                }}
                onPress={async () => {
                  console.log('Button: Xem đơn hàng');
                  setShowSuccessDialog(false);
                  
                  // Xóa flag
                  try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                      await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
                      console.log('Flag removed');
                    }
                  } catch (e) {
                    console.error('Error removing flag:', e);
                  }
                  
                  router.push('/orders');
                }}
              >
                <Text style={{
                  color: '#333',
                  fontSize: 15,
                  fontWeight: '600',
                }}>Xem đơn hàng</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#ff4757',
                }}
                onPress={async () => {
                  console.log('Button: Về trang chủ');
                  setShowSuccessDialog(false);
                  
                  // Xóa flag
                  try {
                    const userString = await AsyncStorage.getItem('user');
                    const user = userString ? JSON.parse(userString) : null;
                    if (user && user._id) {
                      await AsyncStorage.removeItem(`zalopay_success_${user._id}`);
                      console.log('Flag removed');
                    }
                  } catch (e) {
                    console.error('Error removing flag:', e);
                  }
                  
                  router.replace('/(tabs)/home');
                }}
              >
                <Text style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: '600',
                }}>Về trang chủ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
```

### Bước 3: THÊM TEST BUTTON

Để test ngay, thêm button vào đầu ScrollView:

```typescript
<ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
  {/* TEST BUTTON - XÓA SAU KHI TEST XONG */}
  <View style={{ padding: 10, backgroundColor: '#f0f0f0', margin: 10 }}>
    <TouchableOpacity
      style={{ backgroundColor: 'blue', padding: 15, borderRadius: 5 }}
      onPress={() => {
        console.log('TEST: Setting showSuccessDialog to true');
        console.log('Current showSuccessDialog:', showSuccessDialog);
        setShowSuccessDialog(true);
        console.log('After set, showSuccessDialog should be true');
      }}
    >
      <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
        TEST: Show Success Dialog
      </Text>
    </TouchableOpacity>
    
    <Text style={{ marginTop: 10, textAlign: 'center', fontSize: 12 }}>
      Current state: {showSuccessDialog ? 'TRUE' : 'FALSE'}
    </Text>
  </View>

  {/* Sản phẩm */}
  <View style={styles.section}>
```

### Bước 4: TEST

1. **Nhấn button test**
   - Nếu dialog hiển thị → JSX OK, vấn đề ở logic check payment
   - Nếu không hiển thị → Kiểm tra console logs

2. **Xem console logs:**
   ```
   TEST: Setting showSuccessDialog to true
   Current showSuccessDialog: false
   After set, showSuccessDialog should be true
   ```

3. **Nếu dialog vẫn không hiển thị:**
   - Kiểm tra vị trí thêm code (phải TRONG `<SafeAreaView>`)
   - Kiểm tra có lỗi syntax không
   - Kiểm tra console có lỗi không

### Bước 5: Test thanh toán ZaloPay

Sau khi button test hoạt động:

1. Thanh toán ZaloPay
2. Nhấn "Thanh toán thành công"
3. Xem console backend có log:
   ```
   [ZaloPay Callback] ✅ Order updated to "Đã xác nhận"
   ```
4. Back về app
5. Xem console app có log:
   ```
   [Checkout] Screen focused, checking payment success...
   [Checkout] ✅ Payment success detected from backend!
   🎉 handlePaymentSuccess called!
   🎉 Setting showSuccessDialog to true
   ```
6. Dialog hiển thị!

## Nếu vẫn không hoạt động:

### Kiểm tra zalopay-sandbox.html có set flag không

Thêm vào zalopay-sandbox.html sau khi callback thành công:

```javascript
if (response.ok && result.return_code === 1) {
    // ... code hiện tại ...
    
    // ✅ THÊM: Set flag vào localStorage
    try {
        const userId = appuser;
        localStorage.setItem(`zalopay_success_${userId}`, 'true');
        console.log('✅ Set success flag:', `zalopay_success_${userId}`);
    } catch (e) {
        console.error('❌ Failed to set flag:', e);
    }
}
```

### Kiểm tra AsyncStorage có sync với localStorage không

Thêm vào handlePaymentSuccess:

```typescript
const handlePaymentSuccess = React.useCallback(async () => {
    console.log('🎉 handlePaymentSuccess called!');
    
    // ✅ THÊM: Test Alert
    Alert.alert('TEST', 'handlePaymentSuccess được gọi!');
    
    try {
      // ... code hiện tại ...
      
      console.log('🎉 Setting showSuccessDialog to true');
      setShowSuccessDialog(true);
      
      // ✅ THÊM: Test Alert
      Alert.alert('SUCCESS', 'Dialog should show now!');
    } catch (error) {
      console.error('[Checkout] Error:', error);
      Alert.alert('ERROR', error.message);
    }
}, []);
```

## Tóm tắt:

1. ✅ XÓA dialog cũ (dùng styles.xxx)
2. ✅ THÊM dialog mới (dùng inline styles)
3. ✅ THÊM test button
4. ✅ Test button trước
5. ✅ Test thanh toán sau

Làm theo đúng thứ tự này là dialog sẽ hiển thị!
