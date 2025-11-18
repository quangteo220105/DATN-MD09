# Debug: Tại sao Dialog không hiển thị sau thanh toán ZaloPay

## Test button hoạt động = JSX OK ✅

Vấn đề nằm ở **logic kiểm tra thanh toán không chạy** hoặc **flag không được set**.

## Bước 1: Kiểm tra Console Logs

Khi bạn thanh toán và back về, hãy xem console có các logs sau không:

### Logs cần tìm:

```
[Checkout] Screen focused, checking payment success...
[Checkout] Checking payment success for user: xxx
[Checkout] ✅ Payment success flag found!
🎉 handlePaymentSuccess called!
🎉 Setting showSuccessDialog to true
```

### Nếu KHÔNG thấy logs:

→ Logic kiểm tra không chạy hoặc flag không được set

## Bước 2: Kiểm tra zalopay-sandbox.html có set flag không

Mở file `backend/public/zalopay-sandbox.html`, tìm hàm `handlePayment` và kiểm tra:

### Phải có đoạn code này:

```javascript
if (status === 'success') {
    // ... code hiện tại ...
    
    if (response.ok && result.return_code === 1) {
        // ✅ KIỂM TRA CÓ ĐOẠN NÀY KHÔNG:
        try {
            const userId = appuser;
            localStorage.setItem(`zalopay_success_${userId}`, 'true');
            console.log('✅ Set success flag:', `zalopay_success_${userId}`);
            console.log('✅ localStorage:', localStorage.getItem(`zalopay_success_${userId}`));
        } catch (e) {
            console.error('❌ Failed to set flag:', e);
        }
    }
}
```

### Nếu KHÔNG CÓ, THÊM vào:

Tìm dòng `if (response.ok && result.return_code === 1)` và THÊM:

```javascript
async function handlePayment(status) {
    // ... code hiện tại ...

    if (status === 'success') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.classList.add('active');
        
        message = '✅ Thanh toán thành công! Đang gửi callback...';
        statusClass = 'status-success';
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + statusClass;

        try {
            const callbackData = {
                appid: appid,
                apptransid: apptransid,
                pmcid: 'zalopay',
                status: 1,
                amount: amountNum,
                description: description,
                timestamp: Date.now(),
                mac: generateMAC(appid, apptransid, amountNum, status)
            };

            console.log('📤 Sending callback to server:', callbackData);

            const response = await fetch('/api/orders/zalopay/callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(callbackData)
            });

            const result = await response.json();
            console.log('📥 Callback response:', result);

            if (response.ok && result.return_code === 1) {
                // ✅ THÊM ĐOẠN NÀY:
                try {
                    const userId = appuser;
                    localStorage.setItem(`zalopay_success_${userId}`, 'true');
                    console.log('✅ Set success flag:', `zalopay_success_${userId}`);
                    console.log('✅ Flag value:', localStorage.getItem(`zalopay_success_${userId}`));
                } catch (e) {
                    console.error('❌ Failed to set flag:', e);
                }
                
                // ... phần code hiển thị thông báo giữ nguyên
                setTimeout(() => {
                    loadingOverlay.classList.remove('active');
                    message = '✅ Thanh toán thành công! Đơn hàng đã được cập nhật.';
                    statusMessage.textContent = message;
                    // ... code còn lại
                }, 1500);
            }
        } catch (error) {
            console.error('❌ Callback error:', error);
            // ...
        }
    }
}
```

## Bước 3: Kiểm tra Backend có cập nhật đơn hàng không

Xem backend console khi nhấn "Thanh toán thành công":

### Backend logs cần thấy:

```
[ZaloPay Callback] Received: { appid: '2554', apptransid: '...', status: 1, ... }
[ZaloPay Callback] ✅ Order updated to "Đã xác nhận": xxx
```

### Nếu KHÔNG thấy logs:

→ Callback không được gửi hoặc backend không nhận được

## Bước 4: Thêm logs vào checkPaymentSuccess

Trong checkout.tsx, tìm hàm `checkPaymentSuccess` và thêm logs:

```typescript
const checkPaymentSuccess = React.useCallback(async () => {
    console.log('🔍 [CHECK] Starting payment check...');
    try {
      const userString = await AsyncStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      if (!user || !user._id) {
        console.log('❌ [CHECK] No user found');
        return false;
      }

      console.log('🔍 [CHECK] Checking for user:', user._id);

      // Kiểm tra flag thanh toán thành công
      const successFlag = await AsyncStorage.getItem(`zalopay_success_${user._id}`);
      console.log('🔍 [CHECK] Success flag:', successFlag);
      
      if (successFlag === 'true') {
        console.log('✅ [CHECK] Payment success flag found!');
        await handlePaymentSuccess();
        return true;
      }

      // Kiểm tra đơn hàng ZaloPay mới nhất từ backend
      const pendingFlag = await AsyncStorage.getItem(`zalopay_pending_${user._id}`);
      console.log('🔍 [CHECK] Pending flag:', pendingFlag);
      
      if (pendingFlag) {
        const pendingData = JSON.parse(pendingFlag);
        const timeSincePayment = Date.now() - pendingData.timestamp;
        console.log('🔍 [CHECK] Time since payment:', Math.round(timeSincePayment / 1000), 'seconds');
        
        if (timeSincePayment < 10 * 60 * 1000) {
          try {
            console.log('🔍 [CHECK] Checking backend...');
            const response = await fetch(`${BASE_URL}/orders/user/${user._id}/list`);
            
            if (response.ok) {
              const json = await response.json();
              const orders = Array.isArray(json) ? json : json.data || [];
              console.log('🔍 [CHECK] Found', orders.length, 'orders');
              
              const zalopayOrder = orders.find((o: any) => {
                if (o.payment !== 'zalopay') return false;
                const status = (o.status || '').toLowerCase().trim();
                return status === 'đã xác nhận' || 
                       status.includes('xác nhận') || 
                       status === 'confirmed';
              });

              if (zalopayOrder) {
                console.log('✅ [CHECK] Found confirmed ZaloPay order:', zalopayOrder._id);
                const orderTime = zalopayOrder.createdAt ? new Date(zalopayOrder.createdAt).getTime() : 0;
                const timeDiff = Date.now() - orderTime;
                console.log('🔍 [CHECK] Order age:', Math.round(timeDiff / 1000), 'seconds');
                
                if (timeDiff < 10 * 60 * 1000) {
                  console.log('✅ [CHECK] Order is recent, showing dialog!');
                  await AsyncStorage.setItem(`zalopay_success_${user._id}`, 'true');
                  await AsyncStorage.removeItem(`zalopay_pending_${user._id}`);
                  await handlePaymentSuccess();
                  return true;
                }
              } else {
                console.log('❌ [CHECK] No confirmed ZaloPay order found');
              }
            }
          } catch (error) {
            console.error('❌ [CHECK] Error checking backend:', error);
          }
        } else {
          console.log('⏰ [CHECK] Pending flag expired');
        }
      } else {
        console.log('❌ [CHECK] No pending flag');
      }
      
      return false;
    } catch (error) {
      console.error('❌ [CHECK] Error:', error);
      return false;
    }
}, [handlePaymentSuccess]);
```

## Bước 5: Test lại và xem logs

1. **Thanh toán ZaloPay**
2. **Nhấn "Thanh toán thành công"**
3. **Xem console browser:**
   ```
   ✅ Set success flag: zalopay_success_xxx
   ✅ Flag value: true
   ```
4. **Back về app**
5. **Xem console app:**
   ```
   🔍 [CHECK] Starting payment check...
   🔍 [CHECK] Checking for user: xxx
   🔍 [CHECK] Success flag: true
   ✅ [CHECK] Payment success flag found!
   🎉 handlePaymentSuccess called!
   🎉 Setting showSuccessDialog to true
   ```

## Nếu vẫn không hoạt động:

### Giải pháp cuối cùng: Dùng deep link

Thêm vào zalopay-sandbox.html, sau khi callback thành công:

```javascript
if (response.ok && result.return_code === 1) {
    // Set flag
    localStorage.setItem(`zalopay_success_${userId}`, 'true');
    
    // Đợi 2 giây rồi redirect về app với deep link
    setTimeout(() => {
        const appScheme = 'exp://192.168.1.9:8081'; // Thay IP của bạn
        const deepLink = `${appScheme}/--/checkout?payment=success`;
        console.log('🔗 Redirecting to app:', deepLink);
        window.location.href = deepLink;
    }, 2000);
}
```

Và trong checkout.tsx đã có logic xử lý:

```typescript
useEffect(() => {
    if (params.payment === 'success') {
      console.log('✅ Payment success from URL params');
      handlePaymentSuccess();
    }
}, [params.payment]);
```

## Tóm tắt:

1. ✅ Test button hoạt động → JSX OK
2. ❓ Kiểm tra zalopay-sandbox.html có set flag không
3. ❓ Kiểm tra backend có cập nhật đơn hàng không
4. ❓ Thêm logs vào checkPaymentSuccess
5. ❓ Xem console logs để tìm vấn đề
6. 🔧 Dùng deep link nếu localStorage không sync

Làm theo các bước trên để tìm ra vấn đề chính xác!
